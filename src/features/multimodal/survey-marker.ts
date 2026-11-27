/** A large drag target with a surveying pole anchored at the vertex. */
export function surveyMarker(index: number): HTMLElement {
  const element = document.createElement("div");
  element.className = "survey-marker";
  element.title = `Sommet ${index + 1} — glisser pour déplacer`;
  element.setAttribute("aria-label", element.title);
  element.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 29V10" stroke="#202d30" stroke-width="3"/><path d="M15 29h2l-1 2z" fill="#202d30" stroke="#202d30"/><path d="M8 4Q16 1 24 4l-1 5H9z" fill="#f5ce32" stroke="#202d30" stroke-width="1.5"/><path d="M8 4Q16 1 24 4v2H8z" fill="#202d30" stroke="#202d30" stroke-width="1"/><circle cx="16" cy="7.5" r="0.8" fill="#202d30" stroke="none"/></svg>`;
  return element;
}
