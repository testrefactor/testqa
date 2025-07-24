if (!customElements.get("s-main-product")) {
  customElements.define(
    "s-main-product",
    class SectionMainProduct extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.gtmAnalyticViewItemEvent();

        this.productObj = JSON.parse(this.dataset.productJson);
        this.selectedVariant = null;
        this.checkedInputs = ["", "", ""];
        this.activeAccordion = null;
        this._updateVariables();
        if (window.location.href.includes("variant=")) {
          this.checkInputs();
        }
        if (+this.dataset.optionsLength === 1) {
          this.handleSingleOption();
        }

        this.updateHtmlUnsubscribe = window.PubSub.subscribe("main-product:update-html", this._updateProductFromURL);
      }

      disconnectedCallback() {
        this._removeEventListeners();
      }

      gtmAnalyticViewItemEvent = () => {
        const productObject = JSON.parse(this.dataset.productJson);

        const data = {
          detail_page_type: "Product Details Page",
          currency: window.Shopify.currency.active,
          items: [productObject],
        };

        window.PubSub.publish("gtm_view_item", data);
      }

      colorOptionChangeHandle = (event) => {
        const selectedVariant = event.target;

        history.pushState({}, "", selectedVariant.value);

        this.setAttribute("data-product-handle", selectedVariant.dataset.productHandle);
        this.setAttribute("data-media-length", selectedVariant.dataset.mediaLength);
        this.setAttribute("data-product-variant-id", selectedVariant.dataset.productVariantId);
        this._updateProductFromURL(true);
      };

      windowScrollHandler = (event) => {
        // Media sticky size - Must to use js instead of simple css height %, because with % height of this element equals 0px
        const imageHeight = this.mediaGallery?.children?.[0]?.getBoundingClientRect()?.height;
        this.mediaGallery.style.height = `${imageHeight}px`;
        this.mediaSticky.style.height = `${imageHeight}px`;

        // Media nav update
        this.mediaGalleryScrollHandler();

        // Sticky bar
        if (this.stickyBar) {
          if (this.isElementInViewport(this.form)) {
            if (!this.stickyBar.classList.contains("s-main-product__sticky-bar--hide")) {
              this.stickyBar.classList.add("s-main-product__sticky-bar--hide");
            }
          } else {
            this.stickyBar.classList.remove("s-main-product__sticky-bar--hide");
          }
        }
      };

      mediaNavButtonUpClickHandler = () => {
        const imageIdToScroll = `#${this.mediaNavIdTemplate.replace("{index}", this.activeMediaIndex - 1)}`;
        const imageToScroll = this.querySelector(imageIdToScroll);

        if (imageToScroll && this.mediaGallery) {
          const containerRect = this.mediaGallery.getBoundingClientRect();
          const targetRect = imageToScroll.getBoundingClientRect();

          // Determine the position of the scroll
          const scrollTop = this.mediaGallery.scrollTop;
          const targetPosition = targetRect.top - containerRect.top + scrollTop;

          // Smooth scrolling
          this.mediaGallery.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          });
        }
      };

      mediaNavButtonDownClickHandler = () => {
        const imageIdToScroll = `#${this.mediaNavIdTemplate.replace("{index}", this.activeMediaIndex + 1)}`;
        const imageToScroll = this.querySelector(imageIdToScroll);

        if (imageToScroll && this.mediaGallery) {
          const containerRect = this.mediaGallery.getBoundingClientRect();
          const targetRect = imageToScroll.getBoundingClientRect();

          // Determine the position of the scroll
          const scrollTop = this.mediaGallery.scrollTop;
          const targetPosition = targetRect.top - containerRect.top + scrollTop;

          // Smooth scrolling
          this.mediaGallery.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          });
        }
      };

      mediaImageClickHandler = (event) => {
        const slide = event.target.closest(".js-main-product__gallery-item");

        window.PubSub.publish("open-zoom", slide);
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

        const variantId = this.dataset.productVariantId;

        const formData = {
          items: [
            {
              id: variantId,
              quantity: 1,
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
            //response.items[0] is always the last added to cart item
            this.gtmAnalyticAddProductEvent(response.items[0]);
          })
          .catch((error) => {
            this.submitButton.removeAttribute("disabled");
            console.error("Error:", error);
          });
      };

      isElementInViewport = (element) => {
        const rect = element.getBoundingClientRect();
        const headerHeight = document.querySelector(".s-header")?.offsetHeight || 0;
        const announcementBarHeight = document.querySelector(".s-announcement-bar ")?.offsetHeight || 0;
        return !(rect.top > innerHeight || rect.bottom < headerHeight + announcementBarHeight);
      };

      mediaGalleryScrollHandler = () => {
        const containerHeight = this.mediaGallery.clientHeight;
        const contentHeight = this.mediaGallery.scrollHeight;
        const scrollTop = this.mediaGallery.scrollTop;

        // Calculate the position of the scroll bar
        const thumbPosition = (scrollTop / (contentHeight - containerHeight)) * (containerHeight - this.mediaScroll.offsetHeight);
        this.mediaScroll.style.transform = `translate(-50%, ${thumbPosition}px)`;

        // Media nav
        let maxVisibleArea = 0;
        let closestImage = null;

        this.mediaGalleryItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(rect.bottom, containerHeight) - Math.max(rect.top, 0));

          if (visibleHeight > maxVisibleArea) {
            maxVisibleArea = visibleHeight;
            closestImage = item;
          }
        });

        if (closestImage) {
          // Get active media index
          this.activeMediaIndex = parseInt(this._extractIndex(closestImage.id, this.mediaNavIdTemplate));

          // Update states for nav buttons
          if (this.activeMediaIndex == 1) {
            this.mediaNavButtonUp.classList.add("is-disabled");
            this.mediaNavButtonDown.classList.remove("is-disabled");
          }

          if (this.activeMediaIndex == this.mediaLength) {
            this.mediaNavButtonDown.classList.add("is-disabled");
            this.mediaNavButtonUp.classList.remove("is-disabled");
          }
        }
      };

      _extractIndex = (text, template) => {
        const regex = template.replace("{index}", "(\\d+)"); // Replace {index} with a group that captures the number
        const match = text.match(new RegExp(regex));
        return match ? match[1] : null; // Return the found number or null
      };

      _updateProductFromURL = (fullUpdate = false) => {
        const url = new URL(window.location.href);
        url.searchParams.set("section_id", this.sectionId);
        this.querySelector(".js-main-product__loader")?.classList.add("is-active");

        fetch(url.toString())
          .then((response) => response.text())
          .then((newHTML) => {
            let newDom = new DOMParser().parseFromString(newHTML, "text/html");

            if (fullUpdate) {
              this.innerHTML = newDom.querySelector(".js-main-product").innerHTML;
              this.stickyBar.innerHTML = newDom.querySelector(".js-main-product__sticky-bar").innerHTML;
            } else {
              this.mainContainer.innerHTML = newDom.querySelector(".js-main-product__main").innerHTML;
              this.stickyBar.innerHTML = newDom.querySelector(".js-main-product__sticky-bar").innerHTML;
            }
            this._updateVariables();
            this.checkInputs();

            this.checkSubmitButton();
          })
          .catch((error) => {
            console.error(error);
            this.querySelector(".js-main-product__loader")?.classList.remove("is-active");
          })
          .finally(() => {
            this.querySelector(".js-main-product__loader")?.classList.remove("is-active");
          });
      };

      clickHandler = (event) => {
        const target = event.target;
        if (target.closest(".js-main-product__toggle-offers")) {
          this.handleToggleOffers(event);
        }
      };

      handleToggleOffers = (event) => {
        const target = event.target;
        const priceContainer = target.closest(".js-main-product__price-wrapper");
        priceContainer.classList.toggle("is-active");
      };

      openSizeGuide = () => {
        window.PubSub.publish("open-size-guide");
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

      handleOutsidePickerClick = (event) => {
        if (!event.target.closest(".js-product-card__variant-picker-desktop") && !event.target.closest(".js-product-card__open-picker-mobile")) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          this.handleClosePicker();
        }
      };

      handleClosePicker = () => {
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
          input.checked = false;
        });

        document.removeEventListener("click", this.handleOutsidePickerClick);
      };

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
              this.inventoryAlert?.classList.add("hidden");
            } else {
              this.submitButton.classList.remove("not-available");
              this.inventoryAlert?.classList.remove("hidden");
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

      initTabby = () => {
        const tabbyWrapper = this.querySelector(".js-product-main__tabby");

        let tabbyPublicKey;
        let tabbyMerchantCode;

        if (tabbyWrapper) {
          tabbyPublicKey = tabbyWrapper.dataset.publicKey;
          tabbyMerchantCode = tabbyWrapper.dataset.merchantCode;
        }

        if (tabbyWrapper && typeof TabbyPromo === "function") {  
          new TabbyPromo({
           selector: '#TabbyPromo',
           currency: tabbyWrapper.dataset.currency,
           price: tabbyWrapper.dataset.price,
           lang: tabbyWrapper.dataset.lang,
           source: tabbyWrapper.dataset.source,
           publicKey: tabbyPublicKey,
           merchantCode: tabbyMerchantCode
          });
        }
      };

      _updateVariables = () => {
        // Event listeners remove
        this._removeEventListeners();

        // Section variables
        this.sectionId = this.dataset.sectionId;
        this.mainContainer = this.querySelector(".js-main-product__main");
        this.stickyBar = document.querySelector(".js-main-product__sticky-bar");
        this.sizeGuide = this.querySelector(".js-main-product__size-guide");

        // Media Variables
        this.mediaGallery = this.querySelector(".js-main-product__media-gallery");
        this.mediaGalleryItems = this.querySelectorAll(".js-main-product__gallery-item");
        this.mediaSticky = this.querySelector(".js-main-product__media-sticky");
        this.mediaScroll = this.querySelector(".js-main-product__media-scroll");
        this.mediaNavButtonUp = this.querySelector(".js-main-product__media-nav-button--up");
        this.mediaNavButtonDown = this.querySelector(".js-main-product__media-nav-button--down");
        this.activeMediaIndex = 0;
        this.mediaNavIdTemplate = this.dataset.mediaNavIdTemplate;
        this.mediaLength = parseInt(this.dataset.mediaLength);

        // Product form variables
        this.form = this.querySelector(".js-main-product__form");
        this.submitButton = this.querySelector(".js-main-product__form-submit-button");
        this.optionsSelectors = this.querySelectorAll(".js-main-product__option-value");
        this.inputs = this.querySelectorAll(".js-main-product__option-value");
        this.colorOptionInputs = this.querySelectorAll(".js-main-product__color-option-input");
        this.qtyInput = this.querySelector(".js-main-product__qty-input");
        this.qtyButtonMinus = this.querySelector(".js-main-product__qty-button-minus");
        this.qtyButtonPlus = this.querySelector(".js-main-product__qty-button-plus");
        this.inventoryAlert = this.querySelector(".js-main-product__available-text");

        // Event listeners add
        document.addEventListener("DOMContentLoaded", this.windowScrollHandler);
        window.addEventListener("scroll", this.windowScrollHandler);
        window.addEventListener("resize", this.windowScrollHandler);
        this.sizeGuide.addEventListener("click", this.openSizeGuide);
        this.mediaNavButtonUp.addEventListener("click", this.mediaNavButtonUpClickHandler);
        this.mediaNavButtonDown.addEventListener("click", this.mediaNavButtonDownClickHandler);
        this.mediaGallery.addEventListener("scroll", this.mediaGalleryScrollHandler);
        this.mediaGalleryItems?.forEach((item) => item.addEventListener("click", this.mediaImageClickHandler));

        this.form.addEventListener("submit", this.formSubmitHandler);
        this.optionsSelectors?.forEach((selector) => selector.addEventListener("click", this.inputChange));
        this.colorOptionInputs?.forEach((input) => input.addEventListener("change", this.colorOptionChangeHandle));
        this.qtyInput?.addEventListener("change", this.qtyInputChangeHandler);
        this.qtyButtonMinus?.addEventListener("click", this.qtyButtonMinusClickHandler);
        this.qtyButtonPlus?.addEventListener("click", this.qtyButtonPlusClickHandler);

        this.addEventListener("click", this.clickHandler);
        
        if (this.querySelector(".js-product-main__tabby")) {
          this.initTabby();
        }
      };

      _removeEventListeners = () => {
        // Events
        document.removeEventListener("DOMContentLoaded", this.windowScrollHandler);
        window.removeEventListener("scroll", this.windowScrollHandler);
        window.removeEventListener("resize", this.windowScrollHandler);
        this.sizeGuide?.removeEventListener("click", this.openSizeGuide);
        this.mediaNavButtonUp?.removeEventListener("click", this.mediaNavButtonUpClickHandler);
        this.mediaNavButtonDown?.removeEventListener("click", this.mediaNavButtonDownClickHandler);
        this.mediaGallery?.removeEventListener("scroll", this.mediaGalleryScrollHandler);
        this.mediaGalleryItems?.forEach((item) => item.removeEventListener("click", this.mediaImageClickHandler));
        this.form?.removeEventListener("submit", this.formSubmitHandler);
        this.optionsSelectors?.forEach((selector) => selector.removeEventListener("click", this.inputChange));
        this.colorOptionInputs?.forEach((input) => input.removeEventListener("change", this.colorOptionChangeHandle));
        this.qtyInput?.removeEventListener("change", this.qtyInputChangeHandler);
        this.qtyButtonMinus?.removeEventListener("click", this.qtyButtonMinusClickHandler);
        this.qtyButtonPlus?.removeEventListener("click", this.qtyButtonPlusClickHandler);
        this.removeEventListener("click", this.clickHandler);

        //PubSubs
        if (this.updateHtmlUnsubscribe) {
          this.updateHtmlUnsubscribe();
        }
      };
    }
  );
}
