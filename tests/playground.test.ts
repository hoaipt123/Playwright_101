import { test, expect } from "../base/pomFixture";

test.describe("Playground 101 Assignment Tests", () => {

    test("Test Scenario 1: Simple Form Demo", async ({ playgroundPage, page }) => {
        // 1. Open Selenium Playground
        await playgroundPage.navigate();

        // 2. Click "Simple Form Demo"
        await playgroundPage.clickSimpleFormDemo();

        // 3. Validate that the URL contains "simple-form-demo"
        await expect(page).toHaveURL(/.*simple-form-demo.*/);

        // 4. Create a variable for a string value
        const message = "Welcome to TestMu AI";

        // 5. Use this variable to enter values in the "Enter Message" text box
        await playgroundPage.enterMessage(message);

        // 6. Click "Get Checked Value"
        await playgroundPage.clickGetCheckedValue();

        // 7. Validate whether the same text message is displayed under "Your Message:"
        await playgroundPage.verifyDisplayedMessage(message);
    });

    test("Test Scenario 2: Drag & Drop Sliders", async ({ playgroundPage }) => {
        // 1. Open Selenium Playground
        await playgroundPage.navigate();

        // 2. Click "Drag & Drop Sliders"
        await playgroundPage.clickDragDropSliders();

        // 3. Select the slider "Default value 15" and drag it to make it 95
        await playgroundPage.moveSlider15To95();

        // 4. Validate whether the range value shows 95
        await playgroundPage.verifySlider15Value("95");
    });

    test("Test Scenario 3: Input Form Submit", async ({ playgroundPage }) => {
        // 1. Open Selenium Playground
        await playgroundPage.navigate();

        // 2. Click "Input Form Submit"
        await playgroundPage.clickInputFormSubmit();

        // 3. Click "Submit" without filling in any information
        await playgroundPage.clickSubmit();

        // 4. Assert error message
        await playgroundPage.assertValidationErrorMessage();

        // 5. Fill in details and select "United States" using text property
        const formDetails = {
            name: "John Doe",
            email: "johndoe@example.com",
            password: "Password123!",
            company: "Automation Corp",
            website: "https://example.com",
            country: "United States",
            city: "San Francisco",
            address1: "123 Market St",
            address2: "Suite 400",
            state: "California",
            zip: "94105"
        };
        await playgroundPage.fillForm(formDetails);

        // 6. Click "Submit"
        await playgroundPage.clickSubmit();

        // 7. Validate success message
        await playgroundPage.verifySuccessMessage("Thanks for contacting us, we will get back to you shortly.");
    });
});
