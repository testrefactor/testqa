if (!customElements.get("s-recommended-products")) {
  customElements.define(
    "s-recommended-products",
    class SectionRecommendedProducts extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        this.productId = this.getAttribute("data-product-id");
        this.productLimit = this.getAttribute("data-product-limit");
        this.sectionId = this.getAttribute("data-section-id");
        this.shopAllWrapper = this.querySelector(".js-recommended-products__shop-all-wrapper");


        this.addEventListener("click", this._handleClickGTM);

        document.addEventListener("scroll", this.renderRecommendedProducts, { once: true });
        document.addEventListener("touchstart", this.renderRecommendedProducts, { once: true });
        document.addEventListener("mousemove", this.renderRecommendedProducts, { once: true });
        document.addEventListener("click", this.renderRecommendedProducts, { once: true });
        if (this.isInViewport(this)) {
          this.renderRecommendedProducts();
        }
      }

      disconnectedCallback() {
        this.nextBtn?.removeEventListener("click", this.handleNextSlide);
        this.prevBtn?.removeEventListener("click", this.handlePrevSlide);
        this.removeEventListener("click", this._handleClickGTM);
      }

      _handleClickGTM = (event) => {
        let targetProductCard = event.target.closest(".c-product-card");

        if (!targetProductCard) return;

        let productData = JSON.parse(targetProductCard.dataset.productJson);
        let itemListName = this.dataset.productHandle.replaceAll("-", "_");

        let data = {
          item_list_name: `${this.dataset.productHandle} Recommendations Slider`,
          item_list_id: `${itemListName}_recommendations_slider`,
          items: [
            {
              item_id: productData.id,
              item_name: productData.title,
              item_brand: productData.vendor,
              item_category: productData.type,
              price: productData.price,
              quantity: 1,
            },
          ],
        };

        window.PubSub.publish('gtm_select_item', data)
      };
      isInViewport = (el) => {
        const rect = el.getBoundingClientRect();
        return (
          rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      };

      initSlider = () => {
        this.swiperEl = this.querySelector("swiper-container");
        this.nextBtn = this.querySelector(".js-recommended-products__next");
        this.prevBtn = this.querySelector(".js-recommended-products__prev");

        this.nextBtn?.addEventListener("click", this.handleNextSlide);
        this.prevBtn?.addEventListener("click", this.handlePrevSlide);
        this.swiperEl?.initialize();
      };

      handleNextSlide = () => {
        this.swiperEl.swiper.slideNext();
      };

      handlePrevSlide = () => {
        this.swiperEl.swiper.slidePrev();
      };

      renderShopAllBtn = () => {
        let template = this.querySelector(".t-recommended-products__shop-all");
        if (this.shopAllWrapper) {
          this.shopAllWrapper.innerHTML = template.innerHTML.replace(/{link}/g, this.collectionLink);
        }
      };

      renderRecommendedProducts = () => {
        fetch(window.Shopify.routes.root + `recommendations/products?product_id=${this.productId}&limit=${this.productLimit}&section_id=${this.sectionId}&intent=related`)
          .then((response) => response.text())
          .then((text) => {
            const html = document.createElement("div");
            html.innerHTML = text;
            const recommendations = html.querySelector(".js-recommended-products__slider-wrapper");

            if (recommendations?.innerHTML.trim().length) {
              this.querySelector(".js-recommended-products__slider-wrapper").innerHTML = recommendations.innerHTML;
            }
            //we need only the first link, that's why we don't use querySelectorAll
            this.collectionLink = this.querySelector(".js-recommended-products__slide").dataset.collection;
            this.initSlider();
            this.renderShopAllBtn();
          })
          .catch((error) => console.error("Error fetching recommendations:", error));
        document.removeEventListener("scroll", this.renderRecommendedProducts);
        document.removeEventListener("touchstart", this.renderRecommendedProducts);
        document.removeEventListener("mousemove", this.renderRecommendedProducts);
        document.removeEventListener("click", this.renderRecommendedProducts);
      };
    }
  );
}
