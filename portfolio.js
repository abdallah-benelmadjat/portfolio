document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('nav a').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
});
const filters = document.querySelectorAll('[data-filter]');
filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  let count = 0;
  document.querySelectorAll('[data-category]').forEach(project => {
    project.hidden = button.dataset.filter !== 'all' && !project.dataset.category.split(' ').includes(button.dataset.filter);
    if (!project.hidden) count++;
  });
  const status = document.querySelector('[data-filter-status]');
  if (status) status.textContent = count + ' projects shown';
}));
function revealLinkedProject() {
  const target = document.getElementById(location.hash.slice(1));
  if (target?.matches('[data-category]') && target.hidden) {
    filters[0]?.click();
    target.scrollIntoView();
  }
}
window.addEventListener('hashchange', revealLinkedProject);
revealLinkedProject();
// Preserve the existing site's Google Analytics property.
window.dataLayer = window.dataLayer || [];
function gtag() { window.dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-ZZ8VL5Z15M');
const analytics = document.createElement('script');
analytics.async = true;
analytics.src = 'https://www.googletagmanager.com/gtag/js?id=G-ZZ8VL5Z15M';
document.head.appendChild(analytics);

