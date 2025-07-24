if (!customElements.get("c-language-switcher")) {
  customElements.define(
    "c-language-switcher",
    class LanguageSwitcher extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.form = this.querySelector("form");
        this.switchers = this.querySelectorAll(".js-language-switcher__input");

        this.switchers.forEach(switcher => switcher.addEventListener('change', this.handleSwitch))
        this.form.addEventListener("submit", this.handleFormSubmit);
      }

      disconnectedCallback() {
        this.switchers.forEach(switcher => switcher.removeEventListener('change', this.handleSwitch))
        this.form.removeEventListener("submit", this.handleFormSubmit);
      }

      handleSwitch = (event) => {
        const input = event.target;
        input.checked = true;

        const submitEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });

        this.form.dispatchEvent(submitEvent);
      };

      handleFormSubmit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        this.formSubmit();
      };

      formSubmit = () => {
        this.form.removeEventListener("submit", this.handleFormSubmit);

        this.form.submit();
      };
    }
  );
}
