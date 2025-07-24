if (!customElements.get("s-modal-size-guide")) {
  customElements.define(
      "s-modal-size-guide",
      class SectionModalSizeGuide extends HTMLElement {
        constructor() {
          super();
        }

        connectedCallback() {
          this.formMobile = this.querySelector(".js-modal-size-guide__tab-form-m");
          this.formDesktop = this.querySelector(".js-modal-size-guide__tab-form-d");
          this.selectorsCm = Array.from(this.querySelectorAll(".js-modal-size-guide__select-cm"));
          this.selectorsInch = Array.from(this.querySelectorAll(".js-modal-size-guide__select-inch"));

          this.addEventListener("click", this._handleCloseModal);
          this.addEventListener("click", this._handleToggleMobileTab);
          this.addEventListener("click", this._handleInputClick);
          this.addEventListener("click", this._handleDesktopTab);
          this.formMobile?.addEventListener("submit", this.handleFormSubmit);
          this.formDesktop?.addEventListener("submit", this.handleFormSubmit);

          document.addEventListener("DOMContentLoaded", this.handleGetResult);

          this.openModalUnsubscriber = window.PubSub.subscribe("open-size-guide", this.openModal);
          this.closeModalUnsubscriber = window.PubSub.subscribe("close-size-guide", this.closeModal);
        }

        disconnectedCallback() {
          this.openModalUnsubscriber();
          this.closeModalUnsubscriber();

          this.removeEventListener("click", this._handleCloseModal);
          this.removeEventListener("click", this._handleToggleMobileTab);
          this.removeEventListener("click", this._handleInputClick);
          this.removeEventListener("click", this._handleDesktopTab);
          this.formMobile?.removeEventListener("submit", this.handleFormSubmit);
          this.formDesktop?.removeEventListener("submit", this.handleFormSubmit);

          document.removeEventListener("DOMContentLoaded", this.handleGetResult);
        }

        openModal = () => {
          this.classList.add("is-active");
          document.body.classList.add("modal-size-guide-is-active");
        };

        closeModal = () => {
          this.classList.remove("is-active");

          document.body.classList.remove("modal-size-guide-is-active");
        };

        handleGetResult = () => {
          this.resultDatabase = window.SIZE_RESULT;
        };

        handleFormSubmit = (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          // remove all possible prev results
          this.querySelectorAll(".js-modal-size-guide__result-wrapper").forEach((resultWrapper) => {
            resultWrapper.classList.remove("is-active");
          });
          this.querySelectorAll(".js-modal-size-guide__result-error").forEach((resultError) => {
            resultError.classList.remove("is-active");
          });

          const currentForm = event.target;
          const resultWrapper = currentForm.querySelector(".js-modal-size-guide__result-wrapper");
          const resultContainer = currentForm.querySelector(".js-modal-size-guide__result");
          const targetError = currentForm.querySelector(".js-modal-size-guide__result-error");

          let targetUnderband = "";
          let targetOverbust = "";

          if (this.dataset.measure == "cm") {
            targetUnderband = currentForm.querySelector(".js-modal-size-guide__underband-cm").value;
            targetOverbust = currentForm.querySelector(".js-modal-size-guide__overbust-cm").value;
          } else if (this.dataset.measure == "inch") {
            targetUnderband = currentForm.querySelector(".js-modal-size-guide__underband-inch").value;
            targetOverbust = currentForm.querySelector(".js-modal-size-guide__overbust-inch").value;
          }

          if (targetUnderband.trim() === "" || targetOverbust.trim() === "") {
            targetError.classList.add("is-active");
            return;
          }

          const resultText = this.resultDatabase[`${targetOverbust}-${targetUnderband}`];

          if (resultText === "error" || !resultText) {
            targetError.classList.add("is-active");
          } else {
            resultContainer.innerHTML = resultText;
            resultWrapper.classList.add("is-active");
          }
        };

        _handleCloseModal = (event) => {
          let button = event.target.closest(".js-modal-size-guide__close");

          if (!button) return;

          this.closeModal();
        };

        _handleToggleMobileTab = (event) => {
          let button = event.target.closest(".js-modal-size-guide__toggle-mobile-tab");

          if (!button) return;

          button.closest(".s-modal-size-guide__tab-item").classList.toggle("is-active");
        };

        _handleInputClick = (event) => {
          let input = event.target.closest(".js-modal-size-guide__input");

          if (!input) return;

          let targetForm = input.closest(".s-modal-size-guide__tab-form");
          let allInputs = Array.from(targetForm.querySelectorAll(".js-modal-size-guide__input"));

          allInputs.forEach((inp) => inp.classList.remove("is-checked"));

          this.selectorsCm.forEach((select) => select.classList.remove("is-active"));
          this.selectorsInch.forEach((select) => select.classList.remove("is-active"));

          input.checked = true;
          input.classList.add("is-checked");
          this.dataset.measure = input.value;

          if (this.dataset.measure == "cm") {
            this.selectorsCm.forEach((select) => select.classList.add("is-active"));
          } else if (this.dataset.measure == "inch") {
            this.selectorsInch.forEach((select) => select.classList.add("is-active"));
          }

          this.querySelectorAll("select").forEach((sel) => (sel.value = ""));
          this.querySelectorAll(".js-modal-size-guide__result-wrapper").forEach((resultWrapper) => {
            resultWrapper.classList.remove("is-active");
          });
          this.querySelectorAll(".js-modal-size-guide__result-error").forEach((resultError) => {
            resultError.classList.remove("is-active");
          });
        };

        _handleDesktopTab = (event) => {
          let button = event.target.closest(".js-modal-size-guide__desktop-tab");
          let buttonRedirect = event.target.closest(".js-modal-size-guide__open-guide-desktop");

          if (!button && !buttonRedirect) return;

          if (button) {
            this.dataset.desktopTab = button.getAttribute("data-tab-type");
          } else if (buttonRedirect) {
            this.dataset.desktopTab = buttonRedirect.getAttribute("data-tab-type");
          }
        };
      }
  );
}