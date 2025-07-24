if (!customElements.get("s-modal-variant-picker")) {
  customElements.define(
    "s-modal-variant-picker",
    class SectionModalVariantPicker extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.overlay = this.querySelector(".js-modal-variant-picker__overlay");
        this.modal = this;
        this.container = this.querySelector(".js-modal-variant-picker__container");
        this.closeButton = this.querySelector(".js-modal-variant-picker__closer");

        this.openVariantPickerUnsubscriber = window.PubSub.subscribe("open-modal-variant-picker", (data) => {
          this.handleOpener(data);
        });
        this.closeProductDrawerUnsubscriber = window.PubSub.subscribe("close-modal-variant-picker", () => {
          this.handleCloser();
        });

        this.closeButton.addEventListener("click", this.handleCloser);
        this.overlay.addEventListener("click", this.handleCloser);
      }

      disconnectedCallback() {
        this.closeButton.removeEventListener("click", this.handleCloser);
        this.overlay.removeEventListener("click", this.handleCloser);

        this.openVariantPickerUnsubscriber();
        this.closeProductDrawerUnsubscriber();
      }

      handleOpener = async (data) => {
        document.body.classList.add("modal-variant-picker-active");
        await this.renderModal(data);
        this.modal.classList.add("js-active");

        if (data.hasOverlay) {
          this.overlay.classList.add("js-active");
        }

        if (data.edit) {
          this.querySelector(".c-variant-picker").dataset.itemToRemove = data.edit;
        }
      };

      handleCloser = () => {
        this.overlay.classList.remove("js-active");
        this.modal.classList.remove("js-active");

        document.body.classList.remove("modal-variant-picker-active");
      };

      renderModal = async (data) => {
        let url = window.Shopify.routes.root + `products/${data.handle}?variant=${data.variant}&view=variant-picker`;

        await fetch(url)
          .then((response) => response.text())
          .then((text) => {
            this.container.innerHTML = text;
          })
          .catch((error) => {
            console.error(error);
            this.handleCloser();
          });
      };
    }
  );
}
