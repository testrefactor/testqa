if (!customElements.get('c-product-card-2')) {
  customElements.define('c-product-card-2', class ComponentProductCard2 extends HTMLElement {
    constructor() {
     super();

    }

    connectedCallback() {
      this._updateVariables()
    }

    disconnectedCallback() {
      this._removeEventListeners()
    }

    colorOptionChangeHandle = (event) => {
      const selectedVariant = event.target

			this._updateProductFromURL(selectedVariant.value)
    }

    buyButtonClickHandler = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const data = {
        handle: this.buyButton.dataset.productHandle,
        variant: this.buyButton.dataset.variantId,
        hasOverlay: true
      }

      window.PubSub.publish("open-modal-variant-picker", data);
    }

    _updateProductFromURL = (productUrl) => {
      this.setAttribute('disabled', 'true')
			const url = new URL(window.location.origin + productUrl);
			url.searchParams.set('view', 'product-card-2');

			fetch(url.toString())
				.then(response => response.text())
				.then(newHTML => {
					const newDom = new DOMParser().parseFromString(newHTML, 'text/html')

          this.innerHTML = newDom.querySelector('.js-product-card-2').innerHTML;
          this.removeAttribute('disabled')

					this._updateVariables();
				})
				.catch(error => {
          this.removeAttribute('disabled')
					console.error(error);
				})
		}

    _updateVariables = () => {
      // Remove event listeners
      this._removeEventListeners()

      // Variables
      this.colorOptionInputs = this.querySelectorAll('.js-product-card-2__color-option-input')
      this.buyButton = this.querySelector('.js-product-card-2__buy-button')

      // Event listeners
      this.colorOptionInputs.forEach(input => input.addEventListener('change', this.colorOptionChangeHandle))
      this.buyButton.addEventListener('click', this.buyButtonClickHandler)
    }

    _removeEventListeners = () => {
      this.colorOptionInputs?.forEach(input => input.addEventListener('change', this.colorOptionChangeHandle))
      this.buyButton?.removeEventListener('click', this.buyButtonClickHandler)
    }

  });
}