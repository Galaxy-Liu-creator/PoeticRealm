const query = new URLSearchParams(location.search);
// Preserve the P0 experiment behind its existing explicit debug parameters.
if (['scene', 'debug', 't', 'q'].some((key) => query.has(key))) {
  document.body.classList.add('legacy');
  void import('./legacy');
} else {
  void import('./app/Application').then(({ Application }) => {
    new Application(document.querySelector<HTMLElement>('#app')!).start();
  });
}
