import { Page, Locator } from '@playwright/test';

export class PlaygroundLocators {
    constructor(private page: Page) {}

    // Page Menu Links
    get simpleFormDemoLink(): Locator {
        return this.page.locator('a[href*="simple-form-demo"]');
    }

    get dragDropSlidersLink(): Locator {
        return this.page.locator('a[href*="drag-drop-range-sliders-demo"]');
    }

    get inputFormSubmitLink(): Locator {
        return this.page.locator('a[href*="input-form-demo"]');
    }

    // Simple Form Demo Locators
    get messageInput(): Locator {
        return this.page.locator('input#user-message');
    }

    get showInputButton(): Locator {
        return this.page.locator('button#showInput');
    }

    get messageDisplay(): Locator {
        return this.page.locator('p#message');
    }

    // Drag & Drop Sliders Locators
    get slider15Input(): Locator {
        return this.page.locator('#slider3 input');
    }

    get slider15Output(): Locator {
        return this.page.locator('#slider3 output');
    }

    // Input Form Submit Locators
    get nameInput(): Locator {
        return this.page.locator('input#name');
    }

    get emailInput(): Locator {
        return this.page.locator('input#inputEmail4');
    }

    get passwordInput(): Locator {
        return this.page.locator('input#inputPassword4');
    }

    get companyInput(): Locator {
        return this.page.locator('input#company');
    }

    get websiteInput(): Locator {
        return this.page.locator('input#websitename');
    }

    get countrySelect(): Locator {
        return this.page.locator('select[name="country"]');
    }

    get cityInput(): Locator {
        return this.page.locator('input#inputCity');
    }

    get address1Input(): Locator {
        return this.page.locator('input#inputAddress1');
    }

    get address2Input(): Locator {
        return this.page.locator('input#inputAddress2');
    }

    get stateInput(): Locator {
        return this.page.locator('input#inputState');
    }

    get zipInput(): Locator {
        return this.page.locator('input#inputZip');
    }

    get submitButton(): Locator {
        return this.page.locator('button.selenium_btn, button:has-text("Submit")');
    }

    get successMessage(): Locator {
        return this.page.locator('p.success-msg');
    }
}
