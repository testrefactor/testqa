if (!customElements.get("c-product-sticky-bar")) {
  customElements.define(
    "c-product-sticky-bar",
    class ComponentProductStickyBar extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.productObj = JSON.parse(this.dataset.productJson);
        this.selectedVariant = null;
        this.checkedInputs = ["", "", ""];
        this.activeAccordion = null;
        this._updateVariables()
        if (window.location.href.includes("variant=")) {
          this.checkInputs();
        }
        if (+this.dataset.optionsLength === 1) {
          this.handleSingleOption();
        }
      }

      disconnectedCallback() {
        this._removeEventListeners();
      }

      gtmAnalyticAddProductEvent = (itemData) => {
        const data = {
          ecommerce: {
            currency: window.Shopify.currency.active,
            items: [itemData],
          },
        };

        window.PubSub.publish("gtm_add_to_cart", data);
      };

      formSubmitHandler = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        this.submitButton.setAttribute("disabled", "true");

        let variantId = this.dataset.productVariantId;
			let formData = {
				'items': [{
					'id': variantId, 'quantity': 1, 'properties': {"_offerTags": this.dataset.offerTags}
				}]
			};

        await fetch(window.Shopify.routes.root + "cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then((response) => response.json())
          .then((response) => {
            this.submitButton.removeAttribute("disabled");

            window.PubSub.publish("cart-updated", response);
            //response.items[0] is always the last added to cart item
            this.gtmAnalyticAddProductEvent(response.items[0]);
          })
          .catch((error) => {
            this.submitButton.removeAttribute("disabled");
            console.error("Error:", error);
          });
      };

      _updateProductFromURL = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('section_id', this.dataset.sectionId);
        this.querySelector('.js-product-sticky-bar__loader')?.classList.add('is-active');
  
        fetch(url.toString())
          .then(response => response.text())
          .then(newHTML => {
            let newDom = new DOMParser().parseFromString(newHTML, 'text/html')
  
            this.mainContainer.innerHTML = newDom.querySelector('.js-main-product__main').innerHTML
            this.innerHTML = newDom.querySelector('.c-product-sticky-bar').innerHTML
            document.querySelector('.js-main-product').dataset.variantJson = JSON.stringify(this.selectedVariant)
            this._updateVariables();
            this.checkInputs();
  
            this.checkSubmitButton();
            window.PubSub.publish('main-product:update-html')
          })
          .catch(error => {
            console.error(error);
            this.querySelector('.js-product-sticky-bar__loader')?.classList.remove('is-active');
          })
          .finally(() => {
            this.querySelector('.js-product-sticky-bar__loader')?.classList.remove('is-active');
          });
      }

      checkInputs = () => {
        // if we have preselected variant
        if (!this.selectedVariant) {
          this.selectedVariant = JSON.parse(this.dataset.variantJson);
          this.checkedInputs = this.selectedVariant.options;
        }

        let existingVariants = this.productObj.variants;
        if (+this.dataset.optionsLength == 2) {
          existingVariants = this.productObj.variants.filter((variant) => variant.options[0] === this.selectedVariant.options[0]);
        }

        if (+this.dataset.optionsLength == 3) {
          existingVariants = this.productObj.variants.filter((variant) => variant.options[0] === this.selectedVariant.options[0] && variant.options[1] === this.selectedVariant.options[1]);
        }

        for (let input of this.inputs) {
          input.classList.add("disabled");

          // show existing options
          if (this.productObj.options.length === 3 && +input.dataset.optionPosition === 3) {
            const existingVariants3 = this.productObj.variants.filter((variant) => variant.options[0] === this.selectedVariant.options[0] && variant.options[1] === this.selectedVariant.options[1]);
            for (const existingVariant of existingVariants3) {
              if (existingVariant.options[+input.dataset.optionPosition - 1].includes(input.dataset.value) && existingVariant.available) {
                input.classList.remove("disabled");
              }
            }
          } else {
            for (const existingVariant of existingVariants) {
              if (existingVariant.options[+input.dataset.optionPosition - 1].includes(input.dataset.value) && existingVariant.available) {
                input.classList.remove("disabled");
              }
            }
          }

          // select our variant options
          if (this.selectedVariant[`option${input.dataset.optionPosition}`] === input.dataset.value) {
            input.classList.add("checked");
            input.setAttribute("checked", "true");

            if (this.selectedVariant.available) {
              input.classList.remove("disabled");
            } else {
              input.classList.add("disabled");
            }
          }
        }
      };

      getMatchingVariants = () => {
        return this.productObj.variants.filter((variant) => {
          if (this.productObj.options.length === 3) {
            if ((variant.options[0] === this.checkedInputs[0] || !this.checkedInputs[0]) && (variant.options[1] === this.checkedInputs[1] || !this.checkedInputs[1])) {
              return true;
            }
          } else {
            if (variant.options[0] === this.checkedInputs[0] || !this.checkedInputs[0]) {
              return true;
            }
          }
        });
      };

      updateInputStates = (optionPosition, selectedInput, selectedValue, optionsLength, existingVariants, checkedInputsLength) => {
        for (const input of this.inputs) {
          const inputPosition = +input.dataset.optionPosition;

          if (inputPosition !== optionPosition) {
            if (this.checkedInputs[0] !== "" || optionsLength !== 3) {
              input.classList.add("disabled");
            }
          } else {
            if (input.dataset.value === selectedInput.dataset.value) {
              input.classList.add("checked");
              input.setAttribute("checked", "true");
              this.checkedInputs[optionPosition - 1] = input.dataset.value;
            } else {
              input.classList.remove("checked");
              input.removeAttribute("checked");
            }
          }

          for (const existingVariant of existingVariants) {
            const options = existingVariant.options;

            if (optionsLength === 3 || this.productObj.options.length === 3) {
              // need special handle of optionsLength 3
              this.handleThreeOptionInput(input, inputPosition, optionPosition, selectedValue, existingVariant, checkedInputsLength, this.productObj.options.length, options);
            } else {
              this.handleOtherOptionsInput(input, inputPosition, optionPosition, existingVariant, optionsLength, options, checkedInputsLength);
            }
          }
        }
      };

      handleOtherOptionsInput = (input, inputPosition, optionPosition, existingVariant, optionsLength, options, checkedInputsLength) => {
        if (options[inputPosition - 1].includes(input.dataset.value) && existingVariant.available) {
          input.classList.remove("disabled");
        }
        if (this.checkedInputs[0] === options[0]) {
          if (optionsLength === 2 || checkedInputsLength === 2) {
            if (this.checkedInputs[1] === options[1] && this.checkedInputs[2] === options[2]) {
              this.selectedVariant = existingVariant;
            }
          } else {
            this.selectedVariant = existingVariant;
          }
        }
      };

      checkOptionWithSingleValue = () => {
        if (this.productObj.variants.every((variant) => variant.options[0] === this.productObj.variants[0].options[0])) {
          this.checkedInputs[0] = this.productObj.variants[0].options[0];
        }

        if (this.productObj.variants.every((variant) => variant.options[1] === this.productObj.variants[0].options[1])) {
          this.checkedInputs[1] = this.productObj.variants[0].options[1];
        }

        if (this.productObj.variants.every((variant) => variant.options[2] === this.productObj.variants[0].options[2])) {
          this.checkedInputs[2] = this.productObj.variants[0].options[2];
        }
      };

      handleSingleOption = () => {
        for (const input of this.inputs) {
          input.classList.add("disabled");

          for (const variant of this.productObj.variants) {
            if (input.dataset.value === variant.options[+input.dataset.optionPosition - 1] && variant.available) {
              input.classList.remove("disabled");
            }
          }
        }
      };

      handleThreeOptionInput = (input, inputPosition, optionPosition, selectedValue, existingVariant, checkedInputsLength, optionsLength, options) => {
        if (checkedInputsLength === optionsLength) {
          if (inputPosition === 2) {
            if (options[1].includes(input.dataset.value) && existingVariant.available) {
              input.classList.remove("disabled");
            }
          } else if (inputPosition === 3) {
            if (existingVariant.options[2] === input.dataset.value && existingVariant.available) {
              input.classList.remove("disabled");
            }
          }
        } else {
          if (inputPosition === 3 && optionPosition !== 3) {
            if (optionPosition === 2) {
              if (options[0] === this.checkedInputs[0] && options[1] === selectedValue && options[2] === input.dataset.value && existingVariant.available) {
                input.classList.remove("disabled");
              }
            } else {
              if (checkedInputsLength === 1 && optionPosition === 1 && inputPosition === 3 && !this.checkedInputs[1]) {
                input.classList.remove("disabled");
              }
              if (options[0] === selectedValue && options[1] === this.checkedInputs[1] && options[2] === input.dataset.value && existingVariant.available) {
                input.classList.remove("disabled");
              }
            }
          } else {
            if (options[inputPosition - 1].includes(input.dataset.value) && existingVariant.available) {
              input.classList.remove("disabled");
            }
          }
        }
        if (this.checkedInputs[0] === options[0] && this.checkedInputs[1] === options[1] && this.checkedInputs[2] === options[2]) {
          this.selectedVariant = existingVariant;
        }
      };

      inputChange = (event) => {
        event.preventDefault();

        const detailsElement = event.target.closest("details");
        detailsElement.removeAttribute("open");

        this.selectedVariant = null;
        const input = detailsElement.querySelector("input");
        input.title = event.target.title;
        input.value = event.target.title;
        const selectedInput = event.target;
        const selectedValue = selectedInput.dataset.value;
        const optionPosition = +selectedInput.dataset.optionPosition;
        const optionsLength = +this.dataset.optionsLength;
        this.checkedInputs[optionPosition - 1] = selectedValue;

        this.checkOptionWithSingleValue();
        const checkedInputsLength = this.checkedInputs.filter((el) => !!el).length;

        // find possible variants based on checked inputs
        const existingVariants = this.getMatchingVariants();

        // update inputs
        this.updateInputStates(optionPosition, selectedInput, selectedValue, optionsLength, existingVariants, checkedInputsLength);

        if (this.selectedVariant) {
          // update section & search params
          this.updateURLWithVariant(this.selectedVariant.id);
          this.setAttribute("data-product-variant-id", this.selectedVariant.id);

          this._updateProductFromURL(event);
        } else {
          // remove variant from search params
          this.clearVariantFromURL();
          this.checkSubmitButton();
        }
      };

      checkSubmitButton = () => {
        if (this.dataset.oneVariant === "true") {
          this.submitButton.classList.remove("select");
        } else {
          if (window.location.href.includes("variant=")) {
            this.submitButton.classList.remove("select");
          } else {
            this.submitButton.classList.add("select");
            this.submitButton.classList.remove("not-available");

            const checkedInputsLength = this.checkedInputs.filter((input) => !!input).length;

            if (checkedInputsLength === this.productObj.options.length) {
              this.submitButton.classList.remove("select");
              this.submitButton.classList.add("not-available");
            } else {
              this.submitButton.classList.remove("not-available");
            }
          }
        }
      };

      updateURLWithVariant(variantId) {
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.set("variant", variantId);
        history.pushState({}, "", `${window.location.pathname}?${searchParams}`);
      }

      clearVariantFromURL() {
        const searchParams = new URLSearchParams(window.location.search);
        searchParams.delete("variant");
        history.pushState({}, "", window.location.pathname);
      }

      _removeEventListeners = () => {
        this.submitButton?.removeEventListener("click", this.formSubmitHandler);
        this.optionsSelectors?.forEach((selector) => selector.removeEventListener("change", this.optionSelectChangeHandle));
      };

      _updateVariables = () => {
        // Remove event listeners
        this._removeEventListeners();
        this.mainContainer = document.querySelector('.js-main-product__main')

        // Variables
        this.submitButton = this.querySelector(".js-product-sticky-bar__form-submit-button");
        this.optionsSelectors = this.querySelectorAll(".js-product-sticky-bar__option-value");
        this.inputs = this.querySelectorAll(".js-product-sticky-bar__option-value");

        // Event Listeners
        this.submitButton?.addEventListener("click", this.formSubmitHandler);
        this.optionsSelectors.forEach((selector) => selector.addEventListener("click", this.inputChange));
      };
    }
  );
}
