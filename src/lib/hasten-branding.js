const LOGO_SRC = '/hasten-logo.svg';

function isBrandLabel(element) {
  return element?.textContent?.trim() === 'HASTEN';
}

function enhanceBrandRow(label) {
  if (!isBrandLabel(label)) return;

  const textBlock = label.parentElement;
  const row = textBlock?.parentElement;
  if (!row || row.dataset.hastenLogoApplied === 'true') return;

  const iconBlock = textBlock.previousElementSibling;
  if (!iconBlock || !iconBlock.querySelector('svg')) return;

  const image = document.createElement('img');
  image.src = LOGO_SRC;
  image.alt = 'HASTEN Cargo';
  image.className = 'hasten-enterprise-logo';
  image.loading = 'eager';
  image.decoding = 'async';

  iconBlock.replaceWith(image);
  textBlock.style.display = 'none';
  row.dataset.hastenLogoApplied = 'true';
  row.classList.add('hasten-brand-row');
}

function applyBranding(root = document) {
  root.querySelectorAll('div').forEach((element) => {
    if (isBrandLabel(element)) enhanceBrandRow(element);
  });
}

function installBrandStyles() {
  if (document.getElementById('hasten-brand-styles')) return;

  const style = document.createElement('style');
  style.id = 'hasten-brand-styles';
  style.textContent = `
    .hasten-brand-row {
      min-height: 64px;
    }

    .hasten-enterprise-logo {
      display: block;
      width: auto;
      height: 58px;
      max-width: min(190px, 100%);
      object-fit: contain;
      object-position: left center;
      filter: drop-shadow(0 5px 14px rgba(234, 88, 12, 0.24));
    }

    aside .hasten-enterprise-logo,
    nav .hasten-enterprise-logo {
      height: 52px;
      max-width: 160px;
    }

    @media (max-width: 1023px) {
      .hasten-enterprise-logo {
        height: 50px;
        max-width: 155px;
      }
    }
  `;
  document.head.appendChild(style);
}

function startBranding() {
  installBrandStyles();
  applyBranding();

  const observer = new MutationObserver(() => applyBranding());
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBranding, { once: true });
} else {
  startBranding();
}
