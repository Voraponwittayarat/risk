export function printOfficialReport() {
  const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea'));
  const previousStyles = textareas.map((textarea) => ({
    element: textarea,
    height: textarea.style.height,
    overflow: textarea.style.overflow,
  }));

  textareas.forEach((textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 32)}px`;
    textarea.style.overflow = 'visible';
  });
  document.documentElement.classList.add('official-print-active');

  const restore = () => {
    previousStyles.forEach(({ element, height, overflow }) => {
      element.style.height = height;
      element.style.overflow = overflow;
    });
    document.documentElement.classList.remove('official-print-active');
  };

  window.addEventListener('afterprint', restore, { once: true });
  window.requestAnimationFrame(() => window.print());
}
