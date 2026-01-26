let indiaData = {};

async function loadIndiaData() {
  const res = await fetch("/data/india-states-districts.json");
  indiaData = await res.json();

  // Populate state dropdown
  const stateSelect = document.getElementById("state");
  Object.keys(indiaData).forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  });

  // Handle state change to populate districts
  stateSelect.addEventListener("change", function() {
    const selectedState = this.value;
    const districtSelect = document.getElementById("district");
    districtSelect.innerHTML = '<option value="">Select District</option>';
    
    if (selectedState && indiaData[selectedState]) {
      indiaData[selectedState].forEach(district => {
        const option = document.createElement("option");
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
      });
    }
  });
}

function addChild() {
  document.getElementById("children").insertAdjacentHTML(
    "beforeend",
    `
    <div class="border p-3 mb-3 rounded bg-light">
      <input class="form-control mb-2" name="children[][name]" placeholder="Child Name" required>
      <input class="form-control mb-2" name="children[][occupation]" placeholder="Occupation">
      <input class="form-control mb-2" name="children[][dob]" placeholder="Date of Birth" type="date">
      <select class="form-control mb-2" name="children[][gender]">
        <option value="">Select Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
      <div class="mb-2">
        <label class="form-label small">Child Photo</label>
        <div class="d-flex gap-2 mb-2">
          <button type="button" class="btn btn-info btn-sm flex-fill" onclick="openFileDialog('child_' + Date.now())">
            📁 Choose Photo
          </button>
          <button type="button" class="btn btn-info btn-sm flex-fill" onclick="openCameraModal('child_' + Date.now())">
            📷 Take Photo
          </button>
        </div>
        <input type="file" name="children[][photo]" accept="image/*" style="display:none;" onchange="handlePhotoSelect(this, 'child_preview_' + Date.now())">
        <img id="child_preview_${Date.now()}" class="img-thumbnail w-100" style="display:none; max-height: 150px; object-fit: cover;">
      </div>
      <button type="button" class="btn btn-danger btn-sm w-100" onclick="this.parentElement.remove()">Remove</button>
    </div>
    `
  );
}

// Attach addChild function to the button
window.addEventListener("DOMContentLoaded", function() {
  loadIndiaData();
  const addChildBtn = document.querySelector("button[type='button']");
  if (addChildBtn && addChildBtn.textContent.includes("Add Child")) {
    addChildBtn.onclick = addChild;
  }
});
