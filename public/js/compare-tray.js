// Client-side comparison manager
const COMPARE_KEY = "roamhaven_compare_ids";
const MAX_COMPARE = 3;

function getCompareList() {
  try {
    const data = localStorage.getItem(COMPARE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveCompareList(list) {
  try {
    localStorage.setItem(COMPARE_KEY, JSON.stringify(list));
    updateCompareTrayUI();
  } catch (e) {
    console.error("Error saving compare list:", e);
  }
}

function toggleCompare(id, title, imgUrl, price) {
  let list = getCompareList();
  const index = list.findIndex(item => item.id === id);

  if (index > -1) {
    // Remove
    list.splice(index, 1);
  } else {
    // Add if under limit
    if (list.length >= MAX_COMPARE) {
      alert(`You can compare up to ${MAX_COMPARE} properties at a time. Remove one first!`);
      return;
    }
    list.push({ id, title, imgUrl, price });
  }

  saveCompareList(list);
}

function clearCompareList() {
  saveCompareList([]);
}

function goToComparisonPage() {
  const list = getCompareList();
  if (list.length < 2) {
    alert("Please select at least 2 properties to compare side-by-side!");
    return;
  }
  const ids = list.map(item => item.id).join(",");
  window.location.href = `/listings/compare?ids=${ids}`;
}

function updateCompareTrayUI() {
  const tray = document.getElementById("compareTray");
  const countSpan = document.getElementById("compareCount");
  const thumbnailsContainer = document.getElementById("compareThumbnails");
  if (!tray || !countSpan || !thumbnailsContainer) return;

  const list = getCompareList();

  // Update card buttons across page
  document.querySelectorAll(".btn-compare-toggle").forEach(btn => {
    const id = btn.getAttribute("data-id");
    const isSelected = list.some(item => item.id === id);
    if (isSelected) {
      btn.classList.add("btn-compare-active");
      btn.innerHTML = '<i class="fa-solid fa-check me-1"></i> Added';
    } else {
      btn.classList.remove("btn-compare-active");
      btn.innerHTML = '<i class="fa-solid fa-plus me-1"></i> Compare';
    }
  });

  if (list.length === 0) {
    tray.classList.add("d-none");
    return;
  }

  tray.classList.remove("d-none");
  countSpan.innerText = `${list.length}/${MAX_COMPARE}`;

  // Render thumbnails
  thumbnailsContainer.innerHTML = list.map(item => `
    <div class="compare-item-preview position-relative" title="${item.title}">
      <img src="${item.imgUrl}" alt="${item.title}" class="compare-thumb" />
      <span class="compare-thumb-remove" onclick="toggleCompare('${item.id}', '', '', 0)">&times;</span>
    </div>
  `).join("");
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  updateCompareTrayUI();
});
