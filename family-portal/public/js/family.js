let indiaData = {};

async function loadIndiaData() {
  const res = await fetch("/data/india-states-districts.json");
  indiaData = await res.json();

  // Populate State dropdown
  const stateSelect = document.getElementById("state");
  Object.keys(indiaData).forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  });

  // Update District dropdown when state changes
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

let childIndex = 0;

function addChild() {
  const container = document.getElementById("children");
  const memberIndex = 2 + childIndex; // Start from 2 since 0 and 1 are parents

  const html = `
  <div class="card p-3 mb-2 child-card" id="child-${childIndex}">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Child</h6>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeChildRow(${childIndex})">❌ Remove</button>
    </div>

    <input class="form-control mb-2 small" name="members[${memberIndex}][name]" placeholder="Child Name" required>
    <input type="hidden" name="members[${memberIndex}][member_type]" value="child">

    <input type="date" class="form-control mb-2 small" name="members[${memberIndex}][dob]">

    <select class="form-control mb-2 small" name="members[${memberIndex}][gender]">
      <option value="">Select Gender</option>
      <option value="Male">Male</option>
      <option value="Female">Female</option>
      <option value="Other">Other</option>
    </select>

    <input class="form-control mb-2 small" name="members[${memberIndex}][occupation]" placeholder="Occupation">

    <select class="form-control mb-2 small" name="members[${memberIndex}][relationship]">
      <option value="">Relationship</option>
      <option value="son">Son</option>
      <option value="daughter">Daughter</option>
    </select>

    <input type="file" class="form-control small"
      name="members[${memberIndex}][photo]" accept="image/*">
  </div>
  `;

  container.insertAdjacentHTML("beforeend", html);
  childIndex++;
}

/* SAFE remove (no DOM conflict) */
function removeChildRow(index) {
  const el = document.getElementById(`child-${index}`);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}



// Load India data on DOM load
window.addEventListener("DOMContentLoaded", loadIndiaData);

// Handle form submission with AJAX
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("familyForm");

  if (!form) {
    console.error("familyForm not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔥 THIS STOPS PAGE RELOAD

    const formData = new FormData(form);

    try {
      const response = await fetch("/save-family", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert("Family saved successfully ✅");
        window.location.href = "/dashboard";
      } else {
        alert(result.message || "Failed to save family");
      }

    } catch (error) {
      console.error(error);
      alert("Server error");
    }
  });
});
