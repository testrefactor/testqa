if (!customElements.get("product-gallery-zoom")) {
  customElements.define(
    "product-gallery-zoom",
    class ProductGalleryZoom extends HTMLElement {
      constructor() {
        super();
      }

      connectedCallback() {
        // Variables
        this.dragImg = new Image();
        this.dragImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        this.mainSlider = this.querySelector(".js-product-gallery-zoom__wrapper");
        this.zoomWrapper = this.querySelectorAll(".js-product-gallery-zoom__container");
        this.buttonCloser = this.querySelector(".js-product-gallery-zoom__closer");
        this.zoomInButton = this.querySelector(".js-product-gallery-zoom__zoom-button-in");
        this.zoomOutButton = this.querySelector(".js-product-gallery-zoom__zoom-button-out");
        this.progress = this.querySelector(".js-product-gallery-zoom__progress");

        // Event listeners
        this.mainSlider.addEventListener("swiperslidechange", this.sliderChangeHandler);
        this.zoomInButton.addEventListener("click", this.zoomInButtonClickHandler);
        this.zoomOutButton.addEventListener("click", this.zoomOutButtonClickHandler);

        this.buttonCloser.addEventListener("click", this.sliderCloser);

        document.addEventListener("scroll", this.initSlider, { once: true });
        document.addEventListener("touchstart", this.initSlider, { once: true });
        document.addEventListener("mousemove", this.initSlider, { once: true });
        document.addEventListener("click", this.initSlider, { once: true });

        // PubSubs
        this.openZoomUnsubscriber = window.PubSub.subscribe("open-zoom", (slide) => {
          setTimeout(() => {
            this.scrollToSlide(slide);
          }, 300); // to make slider work smoothly
        });
      }

      disconnectedCallback() {
        // Events
        this.mainSlider.removeEventListener("swiperslidechange", this.sliderChangeHandler);
        this.zoomInButton.removeEventListener("click", this.zoomInButtonClickHandler);
        this.zoomOutButton.removeEventListener("click", this.zoomOutButtonClickHandler);
        this.buttonCloser.removeEventListener("click", this.sliderCloser);
        document.removeEventListener("scroll", this.initSlider);
        document.removeEventListener("touchstart", this.initSlider);
        document.removeEventListener("mousemove", this.initSlider);
        document.removeEventListener("click", this.initSlider);
        this.image?.removeEventListener("touchstart", this.handleTouchStart);
        this.image?.removeEventListener("touchmove", this.handleTouchMove);
        this.image?.removeEventListener("touchend", this.handleTouchEnd);
        this.zoomWrapper.forEach((wrapper) => {
          wrapper.removeEventListener("dragstart", this.draggableZoomStart);
          wrapper.removeEventListener("drag", this.draggableZoomMove);
          wrapper.removeEventListener("dragend", this.draggableZoomEnd);
        });

        // PubSubs
        this.openZoomUnsubscriber();
      }

      initSlider = () => {
        this.mainSlider?.initialize();

        document.removeEventListener("scroll", this.initSlider);
        document.removeEventListener("touchstart", this.initSlider);
        document.removeEventListener("mousemove", this.initSlider);
        document.removeEventListener("click", this.initSlider);
      };

      sliderChangeHandler = (event) => {
        // Reset zoom
        this.zoomWrapper.forEach((zoomEl) => {
          zoomEl.setAttribute("data-zoom", "0");
          zoomEl.querySelector("img").style.transform = "";
        });

        // Reset zoom buttons
        this.zoomInButton.removeAttribute("disabled");
        this.zoomOutButton.setAttribute("disabled", "true");

        // Update progress text
        this.progress.innerHTML = `${this.mainSlider.swiper.activeIndex + 1}/${this.mainSlider.swiper.slides.length}`;

        // Update swiper allowTouchMove param
        this.mainSlider.swiper.allowTouchMove = true;

        this.initTouchEvents();
      };

      sliderCloser = () => {
        document.querySelector("body").style.overflowY = "auto";
        this.classList.remove("js-active");
      };

      scrollToSlide = (slide) => {
        this.classList.add("js-active");
        document.querySelector("body").style.overflowY = "hidden";
        const slideIndex = parseInt(slide.dataset.slide);

        this.mainSlider.swiper.slideTo(slideIndex, 0);

        this.initTouchEvents();
      };

      zoomInButtonClickHandler = () => {
        let zoomWrapper = this.querySelector(".js-product-gallery-zoom__cell.swiper-slide-active .js-product-gallery-zoom__container");
        let zoomState = zoomWrapper.getAttribute("data-zoom");

        let img = zoomWrapper.querySelector("img");
        img.style.transform = ``;

        this.startX = null;
        this.startY = null;

        this.positionX = 0;
        this.positionY = 0;

        if (zoomState == "0") {
          zoomWrapper.setAttribute("data-zoom", "1");
          zoomWrapper.addEventListener("dragstart", this.draggableZoomStart);
          zoomWrapper.addEventListener("drag", this.draggableZoomMove);
          zoomWrapper.addEventListener("dragend", this.draggableZoomEnd);
          this.zoomOutButton.removeAttribute("disabled");

          // Update swiper allowTouchMove param
          this.mainSlider.swiper.allowTouchMove = false;

          return;
        }

        if (zoomState === "1") {
          zoomWrapper.setAttribute("data-zoom", "2");
          this.zoomInButton.setAttribute("disabled", "true");
        }
      };

      zoomOutButtonClickHandler = () => {
        let zoomWrapper = this.querySelector(".js-product-gallery-zoom__cell.swiper-slide-active .js-product-gallery-zoom__container");
        let zoomState = zoomWrapper.getAttribute("data-zoom");

        let img = zoomWrapper.querySelector("img");
        img.style.transform = ``;

        this.startX = null;
        this.startY = null;

        this.positionX = 0;
        this.positionY = 0;

        if (zoomState === "1") {
          zoomWrapper.setAttribute("data-zoom", "0");
          zoomWrapper.removeEventListener("dragstart", this.draggableZoomStart);
          zoomWrapper.removeEventListener("drag", this.draggableZoomMove);
          zoomWrapper.removeEventListener("dragend", this.draggableZoomEnd);
          this.zoomOutButton.setAttribute("disabled", "true");

          // Update swiper allowTouchMove param
          this.mainSlider.swiper.allowTouchMove = true;

          return;
        }

        if (zoomState === "2") {
          zoomWrapper.setAttribute("data-zoom", "1");
          this.zoomInButton.removeAttribute("disabled");
        }
      };

      draggableZoomStart = (event) => {
        this.startX = event.clientX;
        this.startY = event.clientY;

        event.dataTransfer.setDragImage(this.dragImg, this.startX, this.startY);
      };

      draggableZoomMove = (event) => {
        let wrapper = event.target.closest(".js-product-gallery-zoom__container");
        let state = wrapper.getAttribute("data-zoom");
        let img = wrapper.querySelector("img");

        let currentX = this.positionX + (this.startX - event.clientX);
        let currentY = this.positionY + (this.startY - event.clientY);

        if (currentX - this.positionX === this.startX) {
          return;
        } // to prevent element from jumping

        img.style.transform = `translate(${-currentX}px, ${-currentY}px) scale(${state == "1" ? 2 : 3})`;
      };

      draggableZoomEnd = (event) => {
        let wrapper = event.target.closest(".js-product-gallery-zoom__container");
        let state = wrapper.getAttribute("data-zoom");
        let img = wrapper.querySelector("img");

        let currentX = this.positionX + (this.startX - event.clientX);
        let currentY = this.positionY + (this.startY - event.clientY);

        img.style.transform = `translate(${-currentX}px, ${-currentY}px) scale(${state == "1" ? 2 : 3})`;

        this.positionX = currentX;
        this.positionY = currentY;
      };

      initTouchEvents = () => {
        this.imageElementScale = 1;
        this.deltaX = 0;
        this.deltaY = 0;
        this.start = {};
        this.allowMove = true;

        this.slide = this.querySelector(".js-product-gallery-zoom__cell.swiper-slide-active");
        this.imageContainer = this.slide?.querySelector(".js-product-gallery-zoom__container");
        this.image = this.imageContainer?.querySelector("img");

        this.image?.addEventListener("touchstart", this.handleTouchStart);
        this.image?.addEventListener("touchmove", this.handleTouchMove);
        this.image?.addEventListener("touchend", this.handleTouchEnd);
      };

      handleTouchStart = (event) => {
        if (event.touches.length === 1) {
          event.preventDefault();

          this.start.x = event.touches[0].pageX;
          this.start.y = event.touches[0].pageY;
        } else if (event.touches.length === 2) {
          event.preventDefault();

          this.start.x = (event.touches[0].pageX + event.touches[1].pageX) / 2;
          this.start.y = (event.touches[0].pageY + event.touches[1].pageY) / 2;
          this.start.distance = Math.hypot(event.touches[0].pageX - event.touches[1].pageX, event.touches[0].pageY - event.touches[1].pageY);
          this.start.scale = this.imageElementScale;
        }
      };

      handleTouchMove = (event) => {
        if (!this.allowMove) {
          return;
        }

        if (event.touches.length === 1) {
          event.preventDefault();

          const deltaX = event.touches[0].pageX - this.start.x;
          const deltaY = event.touches[0].pageY - this.start.y;

          this.start.x = event.touches[0].pageX;
          this.start.y = event.touches[0].pageY;

          const newDeltaX = this.deltaX + deltaX;
          const newDeltaY = this.deltaY + deltaY;
          const maxDeltaX = (this.image.clientWidth * this.imageElementScale - this.imageContainer.clientWidth) / 2;
          const maxDeltaY = (this.image.clientHeight * this.imageElementScale - this.imageContainer.clientHeight) / 2;

          this.deltaX = Math.max(-maxDeltaX, Math.min(maxDeltaX, newDeltaX));
          this.deltaY = Math.max(-maxDeltaY, Math.min(maxDeltaY, newDeltaY));

          this.applyTransform();
        } else if (event.touches.length === 2) {
          event.preventDefault();
          let scale;

          if (event.scale) {
            scale = event.scale;
          } else {
            const deltaDistance = distance(event);
            scale = deltaDistance / this.start.distance;
          }

          this.imageElementScale = Math.min(Math.max(1, this.start.scale * scale), 4);

          if (this.imageElementScale === 1) {
            this.deltaX = 0;
            this.deltaY = 0;
          }

          const maxDeltaX = (this.image.clientWidth * this.imageElementScale - this.imageContainer.clientWidth) / 2;
          const maxDeltaY = (this.image.clientHeight * this.imageElementScale - this.imageContainer.clientHeight) / 2;

          this.deltaX = Math.max(-maxDeltaX, Math.min(maxDeltaX, this.deltaX));
          this.deltaY = Math.max(-maxDeltaY, Math.min(maxDeltaY, this.deltaY));

          this.applyTransform();
        }
      };

      applyTransform = () => {
        const transform = `translate3d(${this.deltaX}px, ${this.deltaY}px, 0) scale(${this.imageElementScale})`;

        this.image.style.transform = transform;
        this.image.style.WebkitTransform = transform;
      };

      handleTouchEnd = (event) => {
        this.allowMove = event.touches.length !== 1;
      };
    }
  );
}
