// PubSub Events:
// 1. 'component-video:play' play video
// 2. 'component-video:stop' stop video playing

if (!customElements.get('c-video')) {
  customElements.define('c-video', class ComponentVideo extends HTMLElement {
    constructor() {
     super();

    }

    connectedCallback() {
      this.videoContainer = this;
      this.video = this.querySelector('video')
      this.videoButton = this.querySelector('.js-video__video-button')

      this.videoContainer.addEventListener('click', this.videoClickHandler)

      this.videoPlayUnsubscribe = window.PubSub.subscribe('component-video:play', this.playVideo)
      this.videoStopUnsubscribe = window.PubSub.subscribe('component-video:stop', this.stopVideo)
    }

    disconnectedCallback() {
      this.videoContainer.removeEventListener('click', this.videoClickHandler)

      this.videoPlayUnsubscribe()
      this.videoStopUnsubscribe()
    }

    videoClickHandler = () => {
      if (!this.video) return

      if (this.video.paused) {
        this.playVideo()
      } else {
        this.stopVideo()
      }
    }

    playVideo = () => {
      this.video.play()
      this.videoButton.setAttribute('data-pause', 'false')
      this.videoButton.setAttribute('data-show', 'false')
    }

    stopVideo = () => {
      this.video.pause()
      this.videoButton.setAttribute('data-pause', 'true')
    }

  });
}