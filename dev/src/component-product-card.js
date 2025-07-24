if (!customElements.get("c-product-card")) {
  customElements.define(
    "c-product-card",
    class ComponentProductCard extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.productObj = JSON.parse(this.dataset.productJson);
        this.selectedVariant = null;
        this.checkedInputs = ["", "", ""];

        this.parentSlider = this.closest(".s-products-slider");
        this.isInMobileSlider = this.parentSlider && window.innerWidth < 768 ? true : false;
        this.variantPickerId = this.querySelector(".js-product-card__variant-picker-desktop")?.id;
        this.overlayId = this.querySelector(".js-product-card__overlay")?.id;

        this.updateVariables();

        if (+this.dataset.optionsLength === 1) {
          this.handleSingleOption();
        }

        this.renderBorders();

        if (this.isInMobileSlider) {
          this.parentSlider.appendChild(this.overlay);
          this.parentSlider.appendChild(this.querySelector(".js-product-card__variant-picker-desktop"));
        }

        this.closePickerUnsubscriber = window.PubSub.subscribe("close-variant-picker", this.handleClosePicker);
      }

      disconnectedCallback() {
        this.inputs.forEach((button) => button.removeEventListener("click", this.inputChange));
        this.quickBuyButton?.removeEventListener("click", this.handleBuyButtonClick);
        this.openPickerMobile?.removeEventListener("click", this.handleOpenPickerMobile);
        document.removeEventListener("click", this.handleOutsidePickerClick);
        window.removeEventListener("resize", window.debounce(this.handleResize, 300));
        this.closePickerUnsubscriber();
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

      hexToRgb = (hex) => {
        let hexColor = hex.replace("#", "");

        if (hexColor.length === 3) {
          hexColor = hexColor
            .split("")
            .map((char) => char + char)
            .join("");
        }

        const r = parseInt(hexColor.substring(0, 2), 16);
        const g = parseInt(hexColor.substring(2, 4), 16);
        const b = parseInt(hexColor.substring(4, 6), 16);

        return [r, g, b];
      };

      isLightColor = (rgb) => {
        const [r, g, b] = rgb.map((c) => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        return luminance > 0.8;
      };

      checkHexContrastAndApplyBorder = (swatch, hexColor) => {
        const rgb = this.hexToRgb(hexColor);
        const isLightColor = this.isLightColor(rgb);
        if (isLightColor) {
          swatch.classList.add("is-contrast");
        }
      };

      renderBorders = () => {
        const swatches = this.querySelectorAll(".js-product-card__swatch");

        swatches.forEach((el) => {
          const color = el.getAttribute("data-color");
          this.checkHexContrastAndApplyBorder(el, color);
        });
      };

      updateVariables = () => {
        this.variantPicker = this.isInMobileSlider
          ? this.parentSlider.querySelector(`#${this.variantPickerId}`).querySelector(".js-product-card__variant-picker")
          : this.querySelector(".js-product-card__variant-picker");
        this.inputs = this.isInMobileSlider
          ? Array.from(this.parentSlider.querySelector(`#${this.variantPickerId}`).querySelectorAll("input.c-product-card__option-input"))
          : Array.from(this.querySelectorAll("input.c-product-card__option-input"));
        this.quickBuyButton = this.isInMobileSlider
          ? this.parentSlider.querySelector(`#${this.variantPickerId}`).querySelector(".js-product-card__quick-buy")
          : this.querySelector(".js-product-card__quick-buy");
        this.openPickerMobile = this.querySelector(".js-product-card__open-picker-mobile");
        this.closeVariantPicker = this.querySelector(".js-product-card__picker-close-modal");
        this.stickyButton = this.isInMobileSlider
          ? this.parentSlider.querySelector(`#${this.variantPickerId}`).querySelector(".js-product-card__picker-sticky-button")
          : this.querySelector(".js-product-card__picker-sticky-button");
        this.overlay = this.isInMobileSlider ? this.parentSlider.querySelector(`#${this.overlayId}`) : this.querySelector(".js-product-card__overlay");
        this.variantPickerWrap = this.isInMobileSlider ? this.parentSlider.querySelector(`#${this.variantPickerId}`) : this.querySelector(".js-product-card__variant-picker-desktop");

        this.inputs?.forEach((button) => button.addEventListener("click", this.inputChange));
        this.quickBuyButton?.addEventListener("click", this.handleBuyButtonClick);
        this.openPickerMobile?.addEventListener("click", this.handleOpenPickerMobile);
        this.closeVariantPicker?.addEventListener("click", this.handleClosePicker);
        window.addEventListener("resize", window.debounce(this.handleResize, 300));
      };

      handleResize = () => {
        this.parentSlider = this.closest(".s-products-slider");
        this.isInMobileSlider = this.parentSlider && window.innerWidth < 768 ? true : false;
        this.variantPickerId = this.variantPickerWrap?.id;
        this.overlayId = this.overlay?.id;

        if (this.isInMobileSlider) {
          this.updateVariables();
          this.parentSlider.appendChild(this.overlay);
          this.parentSlider.appendChild(this.variantPickerWrap);
        } else {
          if (!this.querySelector(".js-product-card__overlay")) {
            this.appendChild(this.overlay);
            this.querySelector(".js-product-card__image-container").appendChild(this.variantPickerWrap);
            this.updateVariables();
          }
        }
      };

      handlePickerDrag = (e) => {
        e.stopPropagation();
        e.preventDefault();

        const touch = e.touches[0];

        const mouseEvent = new MouseEvent(e.type.replace("touch", "drag"), {
          bubbles: true,
          cancelable: true,
          view: window,
          detail: e.detail,
          screenX: touch.screenX,
          screenY: touch.screenY,
          clientX: touch.clientX,
          clientY: touch.clientY,
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
          button: 0,
          relatedTarget: null,
        });

        this.stickyButton.dispatchEvent(mouseEvent);
        this.handleDrag(mouseEvent);
      };

      handleDrag = (e) => {
        const picker = e.target.closest(".js-product-card__variant-picker-desktop");
        picker.style.top = e.clientY + "px";

        if (window.innerHeight - e.clientY < picker.offsetHeight / 2) {
          this.handleClosePicker();
        }

        if (e.clientY <= 0) {
          picker.style.bottom = "0";
        }

        if (e.clientY <= window.innerHeight - picker.offsetHeight) {
          picker.style.bottom = "0";
          picker.style.top = "unset";
        }
      };

      handleOpenPickerMobile = (e) => {
        this.quickBuyButton.click();
        this.stickyButton.addEventListener("touchmove", this.handlePickerDrag);
      };

      handleBuyButtonClick = (event) => {
        const picker = event.target.closest(".js-product-card__variant-picker-desktop");
        if (this.quickBuyButton.dataset.state === "0") {
          this.closeAllPickers();

          if (this.productObj.variants.length === 1) {
            if (this.productObj.variants[0].available) {
              this.selectedVariant = this.productObj.variants[0];
              this.formSubmitHandler(event);
            } else {
              return;
            }
          } else {
            picker.style.bottom = "0";
            picker.style.top = "unset";
            this.variantPicker.classList.add("active");
            this.quickBuyButton.dataset.state = "1";
            this.overlay.classList.add("active");
            document.addEventListener("click", this.handleOutsidePickerClick);
          }
        }

        if (this.quickBuyButton.dataset.state === "2") {
          if (this.quickBuyButton.classList.contains("js-product-card__notify-me")) {
            window.PubSub.publish("open-notify-me");
          } else {
            this.formSubmitHandler(event);
          }
        }
      };

      closeAllPickers = () => {
        window.PubSub.publish("close-variant-picker");
      };

      formSubmitHandler = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        let variantId = this.selectedVariant.id;

        let formData = {
          items: [
            {
              id: variantId,
              quantity: "1",
              properties: { _offerTags: this.dataset.offerTags },
            },
          ],
        };

        fetch(window.Shopify.routes.root + "cart/add.js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        })
          .then(() => {
            fetch(window.Shopify.routes.root + "cart.js", {
              headers: {
                "Content-Type": "application/json",
              },
            })
              .then((cart) => cart.json())
              .then((cart) => {
                window.PubSub.publish("cart-updated", cart);
  
                //cart.items[0] is always the last added to cart item
                this.gtmAnalyticAddProductEvent(cart.items[0]);
              });
          })
          .catch((error) => {
            console.error("Error:", error);
          })
          .finally(() => {
            this.handleClosePicker();
          });
      };

      handleOutsidePickerClick = (event) => {
        if (!event.target.closest(".js-product-card__variant-picker-desktop") && !event.target.closest(".js-product-card__open-picker-mobile")) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          this.handleClosePicker();
        }
      };

      handleClosePicker = () => {
        this.selectedVariant = null;
        this.checkedInputs = ["", "", ""];

        this.overlay.classList.remove("active");

        if (this.variantPicker) {
          this.variantPicker.classList.remove("active");
        }

        if (this.quickBuyButton) {
          this.quickBuyButton.dataset.state = "0";
        }

        const optionInputs = this.isInMobileSlider ? this.parentSlider.querySelector(`#${this.variantPickerId}`).querySelectorAll("input") : this.querySelectorAll("input");

        optionInputs.forEach((input) => {
          input.classList.remove("active");
          input.classList.remove("checked");
          input.classList.remove("disabled");
          input.checked = false;
        });

        document.removeEventListener("click", this.handleOutsidePickerClick);
      };

      checkInputs = () => {
        // find existing variants for first option
        let existingVariants = this.productObj.variants;
        if (+this.dataset.optionsLength !== 1) {
          existingVariants = this.productObj.variants.filter((variant) => variant.options[0] === this.selectedVariant.options[0]);
        }

        for (let input of this.inputs) {
          input.classList.add("disabled");

          // show existing options
          if (this.productObj.options.length === 3 && +input.dataset.optionPosition === 3) {
            const existingVariants3 = this.productObj.variants.filter((variant) => variant.options[0] === this.selectedVariant.options[0] && variant.options[1] === this.selectedVariant.options[1]);
            for (const existingVariant of existingVariants3) {
              if (existingVariant.options[+input.dataset.optionPosition - 1].includes(input.value) && existingVariant.available) {
                input.classList.remove("disabled");
              }
            }
          } else {
            for (const existingVariant of existingVariants) {
              if (existingVariant.options[+input.dataset.optionPosition - 1].includes(input.value) && existingVariant.available) {
                input.classList.remove("disabled");
              }
            }
          }

          // select our variant options
          if (this.selectedVariant[`option${input.dataset.optionPosition}`] === input.value) {
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
            if (input.value === selectedInput.value) {
              input.classList.add("checked");
              input.setAttribute("checked", "true");
              this.checkedInputs[optionPosition - 1] = input.value;
            } else {
              input.classList.remove("checked");
              input.removeAttribute("checked");
            }
          }

          for (const existingVariant of existingVariants) {
            const options = existingVariant.options;

            if (optionsLength === 3 || this.productObj.options.length === 3) {
              // need special handle of optionsLength 3
              this.handleThreeOptionInput(input, inputPosition, optionPosition, selectedValue, existingVariant, checkedInputsLength, this.productObj.options.length, options, existingVariants);
            } else {
              this.handleOtherOptionsInput(input, inputPosition, optionPosition, existingVariant, optionsLength, options, checkedInputsLength);
            }
          }
        }
      };

      handleOtherOptionsInput = (input, inputPosition, optionPosition, existingVariant, optionsLength, options, checkedInputsLength) => {
        if (options[inputPosition - 1].includes(input.value) && existingVariant.available) {
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
        if (!this.inputs || !this.productObj.variants) return;

        for (const input of this.inputs) {
          input.classList.add("disabled");

          for (const variant of this.productObj.variants) {
            if (input.value === variant.options[+input.dataset.optionPosition - 1] && variant.available) {
              input.classList.remove("disabled");
            }
          }
        }
      };

      handleThreeOptionInput = (input, inputPosition, optionPosition, selectedValue, existingVariant, checkedInputsLength, optionsLength, options, existingVariants) => {
        if (checkedInputsLength === optionsLength) {
          if (inputPosition === 2) {
            if (options[1].includes(input.value) && existingVariant.available) {
              input.classList.remove("disabled");
            }
          } else if (inputPosition === 3) {
            input.classList.add("disabled");

            if (existingVariants.some((variant) => variant.options[2] === input.value) && existingVariant.available) {
              input.classList.remove("disabled");
            }
          }
        } else {
          if (inputPosition === 3 && optionPosition !== 3) {
            if (optionPosition === 2) {
              if (options[0] === this.checkedInputs[0] && options[1] === selectedValue && options[2] === input.value && existingVariant.available) {
                input.classList.remove("disabled");
              }
            } else {
              if (checkedInputsLength === 1 && optionPosition === 1 && inputPosition === 3 && !this.checkedInputs[1]) {
                input.classList.remove("disabled");
              }
              if (options[0] === selectedValue && options[1] === this.checkedInputs[1] && options[2] === input.value && existingVariant.available) {
                input.classList.remove("disabled");
              }
            }
          } else {
            if (options[inputPosition - 1].includes(input.value) && existingVariant.available) {
              input.classList.remove("disabled");
            }
          }
        }
        if (this.checkedInputs[0] === options[0] && this.checkedInputs[1] === options[1] && this.checkedInputs[2] === options[2]) {
          this.selectedVariant = existingVariant;
        }
      };

      inputChange = (event) => {
        this.selectedVariant = null;
        const selectedInput = event.target;
        const selectedValue = selectedInput.value;
        const optionPosition = +selectedInput.dataset.optionPosition;
        const optionsLength = +this.dataset.optionsLength;
        this.checkedInputs[optionPosition - 1] = selectedValue;
        this.checkOptionWithSingleValue();
        const checkedInputsLength = this.checkedInputs.filter((el) => !!el).length;

        // find possible variants based on checked inputs
        const existingVariants = this.getMatchingVariants();

        // update inputs
        this.updateInputStates(optionPosition, selectedInput, selectedValue, optionsLength, existingVariants, checkedInputsLength);

        const productHandle = this.dataset.productHandle;
        const picker = event.target.closest(".js-product-card__form-container");
        const buyButton = event.target.closest(".js-product-card__variant-picker-desktop").querySelector(".js-product-card__quick-buy-container");

        if (this.selectedVariant) {
          const variantId = this.selectedVariant.id;
          const promise = new Promise((res, rej) => {
            res(this.getProductCardHTML(productHandle, variantId));
          });

          promise.then((newHTML) => {
            let newDom = new DOMParser().parseFromString(newHTML, "text/html");

            picker.innerHTML = newDom.querySelector(".js-product-card__form-container").innerHTML;
            buyButton.innerHTML = newDom.querySelector(".js-product-card__quick-buy-container").innerHTML;

            this.updateVariables();
            if (this.isInMobileSlider) {
              this.parentSlider.querySelector(`#${this.variantPickerId}`).querySelector(".js-product-card__variant-picker").classList.add("active");
            } else {
              this.querySelector(".js-product-card__variant-picker").classList.add("active");
            }

            this.checkInputs();

            this.checkButtonState();
          });
        } else {
          this.checkButtonState();
        }
      };

      checkButtonState = () => {
        const checkedInputsLength = this.checkedInputs.filter((input) => input !== "").length;

        if (checkedInputsLength === this.checkedInputs.length) {
          if (this.selectedVariant) {
            this.quickBuyButton.dataset.state = "2";
          } else {
            this.quickBuyButton.dataset.state = "3";
          }
        } else {
          this.quickBuyButton.dataset.state = "1";
        }
      };

      async getProductCardHTML(productHandle, variantId) {
        let fetchUrl = `${window.Shopify.routes.root}products/${productHandle}?view=product-card`;
        if (variantId) {
          fetchUrl += `&variant=${variantId}`;
        }
        return await fetch(fetchUrl)
          .then((r) => (r.ok ? r.text() : ""))
          .catch((err) => {
            console.error(err);
          });
      }
    }
  );
}
