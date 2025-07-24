if (!customElements.get("c-variant-picker")) {
  customElements.define(
    "c-variant-picker",
    class ComponentVariantPicker extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.productObj = JSON.parse(this.dataset.productJson);
        this.selectedVariant = null;
        this.checkedInputs = ["", "", ""];
        this.activeAccordion = null;
        this._updateVariables();
        if (+this.dataset.optionsLength === 1) {
          this.handleSingleOption();
        }

        this.updateHtmlUnsubscribe = window.PubSub.subscribe("c-variant-picker:update-html", this._updateProductFromURL);
      }

      disconnectedCallback() {
        this._removeEventListeners();

        if (this.updateHtmlUnsubscribe) {
          this.updateHtmlUnsubscribe();
        }
      }

      checkInputs = () => {
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

        const existingVariants = this.getMatchingVariants();

        this.updateInputStates(optionPosition, selectedInput, selectedValue, optionsLength, existingVariants, checkedInputsLength);

        if (this.selectedVariant) {
          this.updateAttrWithVariant(this.selectedVariant.id);

          this._updateProductFromURL(event);
        } else {
          this.clearVariantFromAttr();
          this.checkSubmitButton();
        }
      };

      checkSubmitButton = () => {
        this.submitButton.classList.remove("select");
        this.submitButton.classList.remove("not-available");
        this.inventoryAlert?.classList.add("hidden");
      };

      updateAttrWithVariant(variantId) {
        this.setAttribute("data-product-variant-id", variantId);
      }

      clearVariantFromAttr() {
        this.setAttribute("data-product-variant-id", "");
      }

      openSizeGuide = () => {
        window.PubSub.publish("open-size-guide");
      };

      _updateVariables = () => {
        this._removeEventListeners();

        this.sectionId = this.dataset.sectionId;
        this.mainContainer = this.querySelector(".js-variant-picker__container");
        this.closeModal = this.querySelector(".js-variant-picker__close-modal");

        this.form = this.querySelector(".js-variant-picker__form");
        this.optionsSelectors = this.querySelectorAll(".js-variant-picker__option-value");
        this.colorOptionInputs = this.querySelectorAll(".js-variant-picker__color-option-input");
        this.inputs = this.querySelectorAll(".js-variant-picker__option-value");
        this.qtyInput = this.querySelector(".js-variant-picker__qty-input");
        this.qtyButtonMinus = this.querySelector(".js-variant-picker__qty-button-minus");
        this.qtyButtonPlus = this.querySelector(".js-variant-picker__qty-button-plus");
        this.submitButton = this.querySelector(".js-variant-picker__form-submit-button");
        this.footer = this.querySelector(".js-variant-picker__footer");
        this.inventoryAlert = this.querySelector(".js-variant-picker__available-text");
        this.sizeGuide = this.querySelector(".js-variant-picker__size-guide");

        this.form.addEventListener("submit", this.formSubmitHandler);
        this.optionsSelectors?.forEach((selector) => selector.addEventListener("click", this.inputChange));
        this.colorOptionInputs?.forEach((input) => input.addEventListener("change", this.colorOptionChangeHandle));
        this.qtyInput?.addEventListener("change", this.qtyInputChangeHandler);
        this.qtyButtonMinus?.addEventListener("click", this.qtyButtonMinusClickHandler);
        this.qtyButtonPlus?.addEventListener("click", this.qtyButtonPlusClickHandler);
        this.closeModal?.addEventListener("click", this.handleModalClose);
        this.submitButton?.addEventListener("click", this.formSubmitHandler);
        this.sizeGuide.addEventListener("click", this.openSizeGuide);

        this.checkInputs();
      };

      _removeEventListeners = () => {
        this.form?.removeEventListener("submit", this.formSubmitHandler);
        this.optionsSelectors?.forEach((selector) => selector.removeEventListener("click", this.inputChange));
        this.colorOptionInputs?.forEach((input) => input.removeEventListener("change", this.colorOptionChangeHandle));
        this.qtyInput?.removeEventListener("change", this.qtyInputChangeHandler);
        this.qtyButtonMinus?.removeEventListener("click", this.qtyButtonMinusClickHandler);
        this.qtyButtonPlus?.removeEventListener("click", this.qtyButtonPlusClickHandler);
        this.closeModal?.removeEventListener("click", this.handleModalClose);
        this.submitButton?.removeEventListener("click", this.formSubmitHandler);
        this.sizeGuide?.removeEventListener("click", this.openSizeGuide);
      };

      handleModalClose = () => {
        window.PubSub.publish("close-modal-variant-picker");
      };

      colorOptionChangeHandle = (event) => {
        const selectedVariant = event.target;

        this.setAttribute("data-product-handle", selectedVariant.dataset.productHandle);
        this.setAttribute("data-product-variant-id", selectedVariant.dataset.productVariantId);
        this._updateProductFromURL(true);
      };

      qtyInputChangeHandler = () => {
        if (parseInt(this.qtyInput.value) > parseInt(this.qtyInput.max)) {
          this.qtyInput.value = this.qtyInput.max;
        }

        if (parseInt(this.qtyInput.value) < parseInt(this.qtyInput.min)) {
          this.qtyInput.value = this.qtyInput.min;
        }

        if (parseInt(this.qtyInput.value) === parseInt(this.qtyInput.max)) {
          this.qtyButtonPlus.setAttribute("disabled", "true");
        } else {
          this.qtyButtonPlus.removeAttribute("disabled");
        }

        if (parseInt(this.qtyInput.value) === parseInt(this.qtyInput.min)) {
          this.qtyButtonMinus.setAttribute("disabled", "true");
        } else {
          this.qtyButtonMinus.removeAttribute("disabled");
        }
      };

      qtyButtonPlusClickHandler = () => {
        this.qtyInput.value = parseInt(this.qtyInput.value) + 1;

        this.qtyInput.dispatchEvent(new Event("change"));
      };

      qtyButtonMinusClickHandler = () => {
        this.qtyInput.value = parseInt(this.qtyInput.value) - 1;

        this.qtyInput.dispatchEvent(new Event("change"));
      };

      gtmAnalyticRemoveProductEvent = (itemData) => {
        const data = {
          ecommerce: {
            currency: window.Shopify.currency.active,
            items: itemData,
          },
        };

        window.PubSub.publish("gtm_remove_from_cart", data);
      };

      deleteItem = async (itemId) => {
        let formData = {
          id: itemId,
          quantity: 0,
        };

        await fetch(window.Shopify.routes.root + "cart/change.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then((response) => response.json())
          .then((cart) => {
            if (cart.items_removed?.length) {
              this.gtmAnalyticItemQtyChangeEvent(cart.items_removed, "remove");
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            this.stopLoader();
          });
      };

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

        if (this.dataset.itemToRemove) {
          await this.deleteItem(this.dataset.itemToRemove);
        }

        this.submitButton.setAttribute("disabled", "true");

        const variantId = this.dataset.productVariantId;
        const formData = {
          items: [
            {
              id: variantId,
              quantity: this.qtyInput.value,
              properties: { _offerTags: this.dataset.offerTags },
            },
          ],
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
            this.gtmAnalyticAddProductEvent(response.items[0]);
            this.handleModalClose();
          })
          .catch((error) => {
            this.submitButton.removeAttribute("disabled");
            console.error("Error:", error);
          });
      };

      async getPickerHtml(productHandle, variantId) {
        let fetchUrl = `${window.Shopify.routes.root}products/${productHandle}?view=variant-picker`;
        if (variantId) {
          fetchUrl += `&variant=${variantId}`;
        }
        return await fetch(fetchUrl)
          .then((r) => (r.ok ? r.text() : ""))
          .catch((err) => {
            console.error(err);
          });
      }

      _updateProductFromURL = (fullUpdate = false) => {
        let fetchUrl = `${window.Shopify.routes.root}products/${this.dataset.productHandle}?view=variant-picker&variant=${this.dataset.productVariantId}`;
        this.querySelector(".js-variant-picker__loader")?.classList.add("is-active");

        fetch(fetchUrl.toString())
          .then((response) => response.text())
          .then((newHTML) => {
            let newDom = new DOMParser().parseFromString(newHTML, "text/html");

            if (fullUpdate) {
              this.innerHTML = newDom.querySelector(".js-variant-picker").innerHTML;
            } else {
              this.mainContainer.innerHTML = newDom.querySelector(".js-variant-picker__container").innerHTML;
              this.footer.innerHTML = newDom.querySelector(".js-variant-picker__footer").innerHTML;
            }
            this._updateVariables();
          })
          .catch((error) => {
            console.error(error);
            this.querySelector(".js-variant-picker__loader")?.classList.remove("is-active");
          })
          .finally(() => {
            this.querySelector(".js-variant-picker__loader")?.classList.remove("is-active");
          });
      };
    }
  );
}
