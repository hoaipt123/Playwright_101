import { Page, expect } from '@playwright/test';
import { PlaygroundLocators } from '../locators/playground-locators';

export class PlaygroundPage {
    private locators: PlaygroundLocators;

    constructor(public page: Page) {
        this.locators = new PlaygroundLocators(page);
    }

    async navigate() {
        await this.page.goto('https://www.testmuai.com/selenium-playground/');
    }

    // Scenario 1 Actions
    async clickSimpleFormDemo() {
        await this.locators.simpleFormDemoLink.click();
    }

    async enterMessage(message: string) {
        await this.locators.messageInput.fill(message);
    }

    async clickGetCheckedValue() {
        await this.locators.showInputButton.click();
    }

    async verifyDisplayedMessage(expectedMessage: string) {
        await expect(this.locators.messageDisplay).toHaveText(expectedMessage);
    }

    // Scenario 2 Actions
    async clickDragDropSliders() {
        await this.locators.dragDropSlidersLink.click();
    }

    async moveSlider15To95() {
        const slider = this.locators.slider15Input;
        const output = this.locators.slider15Output;
        await slider.scrollIntoViewIfNeeded();

        const box = await slider.boundingBox();
        if (box) {
            // First drag close to 95%
            const startX = box.x + (box.width * 0.15); // Start at 15
            const startY = box.y + box.height / 2;
            const targetX = box.x + (box.width * 0.95);
            const targetY = box.y + box.height / 2;

            await this.page.mouse.move(startX, startY);
            await this.page.mouse.down();
            await this.page.mouse.move(targetX, targetY, { steps: 10 });
            await this.page.mouse.up();
        }

        // Now focus the slider and use Arrow keys to adjust until the output is exactly "95"
        await slider.focus();
        let currentValue = await output.textContent();
        let attempts = 0;
        
        while (currentValue !== "95" && attempts < 50) {
            attempts++;
            const valNum = parseInt(currentValue || "15", 10);
            if (valNum < 95) {
                await this.page.keyboard.press("ArrowRight");
            } else if (valNum > 95) {
                await this.page.keyboard.press("ArrowLeft");
            }
            currentValue = await output.textContent();
        }
        console.log(`Slider reached value: ${currentValue} after ${attempts} adjustments`);
    }

    async verifySlider15Value(expectedValue: string) {
        await expect(this.locators.slider15Output).toHaveText(expectedValue);
    }

    // Scenario 3 Actions
    async clickInputFormSubmit() {
        await this.locators.inputFormSubmitLink.click();
    }

    async clickSubmit() {
        await this.locators.submitButton.click();
    }

    async assertValidationErrorMessage() {
        const nameInput = this.locators.nameInput;
        // In Playwright, native HTML5 validation messages can be asserted by checking the validationMessage property
        const validationMessage = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
        console.log('Form validation message (native):', validationMessage);
        
        // Assert it is not empty (which means the browser blocks submit and shows validation message)
        expect(validationMessage).not.toBeNull();
        expect(validationMessage.length).toBeGreaterThan(0);
        
        // We can also verify that the form checkValidity returns false
        const isFormValid = await nameInput.evaluate((el: HTMLInputElement) => el.checkValidity());
        expect(isFormValid).toBe(false);
    }

    async fillForm(details: {
        name: string;
        email: string;
        password: string;
        company: string;
        website: string;
        country: string;
        city: string;
        address1: string;
        address2: string;
        state: string;
        zip: string;
    }) {
        await this.locators.nameInput.fill(details.name);
        await this.locators.emailInput.fill(details.email);
        await this.locators.passwordInput.fill(details.password);
        await this.locators.companyInput.fill(details.company);
        await this.locators.websiteInput.fill(details.website);
        
        // Select country using option text
        await this.locators.countrySelect.selectOption({ label: details.country });
        
        await this.locators.cityInput.fill(details.city);
        await this.locators.address1Input.fill(details.address1);
        await this.locators.address2Input.fill(details.address2);
        await this.locators.stateInput.fill(details.state);
        await this.locators.zipInput.fill(details.zip);
    }

    async verifySuccessMessage(expectedText: string) {
        await expect(this.locators.successMessage).toHaveText(expectedText);
    }
}
