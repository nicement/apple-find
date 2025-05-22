// content.js

const HIGHLIGHT_CLASS = "apple-find-highlight";
let lastEmphasizedComboId = null;

function clearHighlights() {
  const existingHighlights = document.querySelectorAll("." + HIGHLIGHT_CLASS);
  existingHighlights.forEach((el) => el.remove());
  console.log("[Apple Finder] Cleared previous highlights.");
  lastEmphasizedComboId = null; // Reset emphasized combo
}

function emphasizeCombination(clickedComboId) {
  console.log(`[Apple Finder] Emphasizing combo: ${clickedComboId}`);
  const allHighlights = document.querySelectorAll("." + HIGHLIGHT_CLASS);

  allHighlights.forEach(hl => {
    // Reset to default non-emphasized state
    hl.style.outline = hl.dataset.originalOutline;
    hl.style.backgroundColor = 'transparent';
    hl.style.transform = 'scale(1.0)'; // Reset any scaling
    hl.style.zIndex = '2147483646'; // Default z-index for non-emphasized
  });

  const selectedHighlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}[data-combo-id="${clickedComboId}"]`);
  
  if (clickedComboId === lastEmphasizedComboId) {
    // If the same combo is clicked again, toggle off emphasis (all already reset)
    lastEmphasizedComboId = null;
    console.log(`[Apple Finder] Toggled off emphasis for combo: ${clickedComboId}`);
    return;
  }

  selectedHighlights.forEach(hl => {
    hl.style.outlineWidth = '5px'; // Thicker outline for emphasis
    hl.style.transform = 'scale(1.02)'; // Slightly scale up for emphasis

    const originalColorRgba = hl.dataset.originalColorRgba;
    if (originalColorRgba) {
      // Attempt to create a lighter background from the original RGBA
      try {
        const parts = originalColorRgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (parts) {
          hl.style.backgroundColor = `rgba(${parts[1]}, ${parts[2]}, ${parts[3]}, 0.2)`; // Use original RGB with low alpha
        }
      } catch (e) {
        console.warn("[Apple Finder] Could not parse original color for background:", originalColorRgba, e);
      }
    }
    hl.style.zIndex = '2147483647'; // Max z-index for emphasized elements
  });
  lastEmphasizedComboId = clickedComboId;
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "highlight") {
    console.log("[Apple Finder] Received highlight request:", request);
    clearHighlights();

    if (request.combos && Array.isArray(request.combos)) {
      request.combos.forEach((comboData) => {
        if (comboData && comboData.numbers && comboData.color && comboData.id) {
          comboData.numbers.forEach((bbox) => {
            const highlightEl = document.createElement("div");
            highlightEl.classList.add(HIGHLIGHT_CLASS);
            highlightEl.dataset.comboId = comboData.id;
            
            // Store original visual properties for reset
            highlightEl.dataset.originalOutline = `3px solid ${comboData.color}`;
            highlightEl.dataset.originalColorRgba = comboData.color; // Store full RGBA string

            const scrollX = window.scrollX;
            const scrollY = window.scrollY;

            highlightEl.style.position = "absolute";
            highlightEl.style.left = `${bbox.x0 + scrollX}px`;
            highlightEl.style.top = `${bbox.y0 + scrollY}px`;
            highlightEl.style.width = `${bbox.x1 - bbox.x0}px`;
            highlightEl.style.height = `${bbox.y1 - bbox.y0}px`;
            
            highlightEl.style.outline = highlightEl.dataset.originalOutline;
            highlightEl.style.backgroundColor = 'transparent'; // Default
            highlightEl.style.boxSizing = "border-box";
            highlightEl.style.zIndex = "2147483646"; // Default z-index
            highlightEl.style.pointerEvents = "auto"; // Enable clicks
            highlightEl.style.transition = "transform 0.1s ease-in-out, background-color 0.1s ease-in-out"; // Smooth transition

            document.body.appendChild(highlightEl);
          });
        } else {
          console.warn("[Apple Finder] Invalid comboData received:", comboData);
        }
      });
      console.log(`[Apple Finder] Applied ${request.combos.length} new combination highlights.`);
    } else {
      console.warn("[Apple Finder] No combos found in request or invalid format:", request.combos);
    }
    sendResponse({ status: "highlights processed" }); 
  }
  return true; 
});

document.addEventListener('click', function(event) {
  let targetElement = event.target;
  // Traverse up if the click was on an inner element of a highlight (though unlikely with current structure)
  while (targetElement != null && !targetElement.classList.contains(HIGHLIGHT_CLASS)) {
    if (targetElement.parentElement === document.body || targetElement.parentElement == null) {
        targetElement = null; // Stop if we reach body or run out of parents
        break;
    }
    targetElement = targetElement.parentElement;
  }

  if (targetElement && targetElement.classList.contains(HIGHLIGHT_CLASS)) {
    const comboId = targetElement.dataset.comboId;
    if (comboId) {
      emphasizeCombination(comboId);
    }
  }
}, true); // Use capture phase to potentially catch clicks earlier

console.log("[Apple Finder] Content script loaded with interactive highlighting and listening for messages.");
