import { chromium, test as baseTest, BrowserContext, Page, Request, TestInfo } from "@playwright/test";
import { PlaygroundPage } from "../pages/playground-page";
import path from "path"
import fs from "fs"

type pages = {
    playgroundPage: PlaygroundPage;
}

// Every test writes its local evidence (video, screenshots, console + network logs) to
// evidence/<test title>/ inside the project root.
const EVIDENCE_ROOT = path.join(__dirname, "..", "evidence");

// LambdaTest capabilities
const capabilities = {
    browserName: "Chrome", // Browsers allowed: `Chrome`, `MicrosoftEdge`, `pw-chromium`, `pw-firefox` and `pw-webkit`
    browserVersion: "latest",
    "LT:Options": {
        platform: "Windows 10",
        build: "Playwright Test Build",
        name: "Playwright Test",
        // Credentials come from .env - see .env.example.
        user: process.env.LT_USERNAME,
        accessKey: process.env.LT_ACCESS_KEY,
        network: true,  // Enable network logs
        video: true,    // Enable video recording of the entire screen
        console: true,  // Enable browser console logs
        visual: true,   // Capture screenshot for every command
        tunnel: false, // Add tunnel configuration if testing locally hosted webpage
        tunnelName: "", // Optional
        geoLocation: '', // country code can be fetched from https://www.lambdatest.com/capabilities-generator/
    },
};

// Patching the capabilities dynamically according to the project name.
const modifyCapabilities = (configName: string, testName: string) => {
    if (!capabilities["LT:Options"].user || !capabilities["LT:Options"].accessKey) {
        throw new Error(
            "Missing LT_USERNAME / LT_ACCESS_KEY. Copy .env.example to .env and fill in " +
            "your credentials from https://accounts.lambdatest.com/details/profile"
        );
    }
    let config = configName.split("@lambdatest")[0];
    let [browserName, browserVersion, platform] = config.split(":");
    capabilities.browserName = browserName
        ? browserName
        : capabilities.browserName;
    capabilities.browserVersion = browserVersion
        ? browserVersion
        : capabilities.browserVersion;
    capabilities["LT:Options"]["platform"] = platform
        ? platform
        : capabilities["LT:Options"]["platform"];
    capabilities["LT:Options"]["name"] = testName;
};

const getErrorMessage = (obj: any, keys: string[]) =>
    keys.reduce(
        (obj: any, key: string) => (typeof obj == "object" ? obj[key] : undefined),
        obj
    );

const sanitize = (value: string) =>
    value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);

// Creates a clean evidence folder for the test and returns the context options that
// record the video and the network traffic straight into it.
const prepareEvidence = (testInfo: TestInfo) => {
    const dir = path.join(EVIDENCE_ROOT, sanitize(testInfo.title));
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    return {
        dir,
        contextOptions: {
            viewport: (testInfo.project.use as any).viewport,
            recordVideo: { dir: path.join(dir, ".video") },
            // NOTE: recordHar is deliberately not used here. The LambdaTest CDP endpoint
            // does not return the HAR artifact on context.close(), which fails the test
            // with "expected object, got undefined". network.har is built from request
            // and response events instead - see captureNetwork.
        },
    };
};

// Buffers browser console output and uncaught page errors; the returned function
// flushes them to console.log.
const captureConsole = (page: Page, dir: string) => {
    const lines: string[] = [];
    page.on("console", (msg) =>
        lines.push(`[${new Date().toISOString()}] [${msg.type()}] ${msg.text()}`));
    page.on("pageerror", (err) =>
        lines.push(`[${new Date().toISOString()}] [pageerror] ${err.message}`));
    return () => fs.writeFileSync(path.join(dir, "console.log"), lines.join("\n"), "utf8");
};

const toHeaderArray = (headers: Record<string, string>) =>
    Object.entries(headers).map(([name, value]) => ({ name, value }));

// Records every request/response pair and writes them out as a HAR 1.2 file, which
// opens in the Chrome DevTools Network tab or any HAR viewer.
const captureNetwork = (page: Page, dir: string) => {
    const entries: any[] = [];
    const pending: Promise<void>[] = [];

    const record = async (request: Request, failure?: string) => {
        try {
            const response = await request.response();
            const timing = request.timing();
            const url = new URL(request.url());
            const span = (from: number, to: number) => (from < 0 || to < 0 ? -1 : Math.max(0, to - from));

            entries.push({
                startedDateTime: new Date(timing.startTime).toISOString(),
                time: Math.max(0, timing.responseEnd),
                request: {
                    method: request.method(),
                    url: request.url(),
                    httpVersion: "HTTP/1.1",
                    headers: toHeaderArray(request.headers()),
                    queryString: [...url.searchParams].map(([name, value]) => ({ name, value })),
                    cookies: [],
                    headersSize: -1,
                    bodySize: request.postData()?.length ?? 0,
                },
                response: {
                    status: response?.status() ?? 0,
                    statusText: response?.statusText() ?? (failure || "failed"),
                    httpVersion: "HTTP/1.1",
                    headers: toHeaderArray(response?.headers() ?? {}),
                    cookies: [],
                    content: { size: -1, mimeType: response?.headers()["content-type"] ?? "" },
                    redirectURL: "",
                    headersSize: -1,
                    bodySize: -1,
                },
                cache: {},
                timings: {
                    blocked: -1,
                    dns: span(timing.domainLookupStart, timing.domainLookupEnd),
                    ssl: span(timing.secureConnectionStart, timing.connectEnd),
                    connect: span(timing.connectStart, timing.connectEnd),
                    send: 0,
                    wait: span(timing.requestStart, timing.responseStart),
                    receive: span(timing.responseStart, timing.responseEnd),
                },
                _resourceType: request.resourceType(),
                ...(failure ? { _failure: failure } : {}),
            });
        } catch {
            // The page can go away mid-flight; a missing entry must never fail the test.
        }
    };

    page.on("requestfinished", (request) => pending.push(record(request)));
    page.on("requestfailed", (request) =>
        pending.push(record(request, request.failure()?.errorText)));

    return async () => {
        await Promise.all(pending);
        const har = {
            log: {
                version: "1.2",
                creator: { name: "playwright101-fixture", version: "1.0" },
                entries: entries.sort((a, b) =>
                    a.startedDateTime.localeCompare(b.startedDateTime)),
            },
        };
        fs.writeFileSync(path.join(dir, "network.har"), JSON.stringify(har, null, 2), "utf8");
    };
};

// Takes the final screenshot, closes the context so the HAR and the video are flushed
// to disk, then attaches everything to the HTML report.
const saveEvidence = async (
    page: Page,
    context: BrowserContext,
    dir: string,
    testInfo: TestInfo,
    flushConsole: () => void,
    flushNetwork: () => Promise<void>
) => {
    const video = page.video();
    const screenshot = path.join(dir, "screenshots", `final-${testInfo.status}.png`);

    await page.screenshot({ path: screenshot, fullPage: true });
    flushConsole();
    await flushNetwork();
    await context.close(); // finalises the video file

    if (video) {
        await video.saveAs(path.join(dir, "video.webm"));
        await video.delete();
    }
    fs.rmSync(path.join(dir, ".video"), { recursive: true, force: true });

    await testInfo.attach("video", { path: path.join(dir, "video.webm"), contentType: "video/webm" });
    await testInfo.attach("screenshot", { path: screenshot, contentType: "image/png" });
    await testInfo.attach("console logs", { path: path.join(dir, "console.log"), contentType: "text/plain" });
    await testInfo.attach("network logs", { path: path.join(dir, "network.har"), contentType: "application/json" });
};

const testPages = baseTest.extend<pages>({
    page: async ({ }, use, testInfo) => {
        let fileName = testInfo.file.split(path.sep).pop();
        const { dir, contextOptions } = prepareEvidence(testInfo);

        if (testInfo.project.name.match(/lambdatest/)) {
            modifyCapabilities(
                testInfo.project.name,
                `${testInfo.title} - ${fileName}`
            );
            const browser = await chromium.connect(`wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify(capabilities))}`);
            const context = await browser.newContext(contextOptions);
            const ltPage = await context.newPage()
            const flushConsole = captureConsole(ltPage, dir);
            const flushNetwork = captureNetwork(ltPage, dir);

            await use(ltPage);

            const testStatus = {
                action: "setTestStatus",
                arguments: {
                    status: testInfo.status,
                    remark: getErrorMessage(testInfo, ["error", "message"]),
                },
            };
            await ltPage.evaluate(() => { },
                `lambdatest_action: ${JSON.stringify(testStatus)}`);

            await saveEvidence(ltPage, context, dir, testInfo, flushConsole, flushNetwork);
            await browser.close();
        } else {
            const browser = await chromium.launch();
            const context = await browser.newContext(contextOptions);
            const page = await context.newPage()
            const flushConsole = captureConsole(page, dir);
            const flushNetwork = captureNetwork(page, dir);

            await use(page);

            await saveEvidence(page, context, dir, testInfo, flushConsole, flushNetwork);
            await browser.close();
        }
    },

    playgroundPage: async ({ page }, use) => {
        await use(new PlaygroundPage(page));
    },

})

export const test = testPages;
export const expect = testPages.expect;
