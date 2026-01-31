let indiaData = {};

async function loadIndiaData() {
  const res = await fetch("/data/india-states-districts.json");
  indiaData = await res.json();

  const stateSelect = document.getElementById("state");
  Object.keys(indiaData).forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  });

  stateSelect.addEventListener("change", function () {
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
  const html = `
  <div class="card p-3 mb-2 child-card" id="child-${childIndex}">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Child</h6>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeChildRow(${childIndex})">❌ Remove</button>
    </div>
    <input class="form-control mb-2 small" name="children[${childIndex}][name]" placeholder="Child Name" required>
    <input type="date" class="form-control mb-2 small" name="children[${childIndex}][dob]">
    <select class="form-control mb-2 small" name="children[${childIndex}][gender]">
      <option value="">Select Gender</option>
      <option value="Male">Male</option>
      <option value="Female">Female</option>
      <option value="Other">Other</option>
    </select>
    <input class="form-control mb-2 small" name="children[${childIndex}][occupation]" placeholder="Occupation">
    <select class="form-control mb-2 small" name="children[${childIndex}][relationship]">
      <option value="">Relationship</option>
      <option value="son">Son</option>
      <option value="daughter">Daughter</option>
    </select>
    <input type="file" class="form-control small" name="children[${childIndex}][photo]" accept="image/*">
  </div>`;
  container.insertAdjacentHTML("beforeend", html);
  childIndex++;
}

function removeChildRow(index) {
  const el = document.getElementById(`child-${index}`);
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

window.addEventListener("DOMContentLoaded", loadIndiaData);

// ================== FORM SUBMIT ==================
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("familyForm");
  if (!form) {
    console.error("familyForm not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const members = [];

    // Add husband
    const husbandName = formData.get("husband_name");
    if (husbandName) {
      members.push({
        member_type: "parent",
        name: husbandName,
        relationship: "husband",
        mobile: formData.get("parent[mobile]") || null,
        occupation: formData.get("parent[occupation]") || null,
        door_no: formData.get("parent[door_no]") || null,
        street: formData.get("parent[street]") || null,
        district: formData.get("parent[district]") || null,
        state: formData.get("parent[state]") || null,
        pincode: formData.get("parent[pincode]") || null
      });
    }

    // Add wife
    const wifeName = formData.get("parent[wife_name]");
    if (wifeName) {
      members.push({
        member_type: "parent",
        name: wifeName,
        relationship: "wife",
        mobile: formData.get("parent[mobile_wife]") || null,
        occupation: formData.get("parent[occupation_wife]") || null,
        door_no: formData.get("parent[door_no]") || null,
        street: formData.get("parent[street]") || null,
        district: formData.get("parent[district]") || null,
        state: formData.get("parent[state]") || null,
        pincode: formData.get("parent[pincode]") || null
      });
    }

    // Add children
    const childrenContainer = document.getElementById("children");
    const childCards = childrenContainer.querySelectorAll(".child-card");
    childCards.forEach((card, index) => {
      const childName = formData.get(`children[${index}][name]`);
      if (childName) {
        members.push({
          member_type: "child",
          name: childName,
          relationship: formData.get(`children[${index}][relationship]`) || null,
          dob: formData.get(`children[${index}][dob]`) || null,
          gender: formData.get(`children[${index}][gender]`) || null,
          occupation: formData.get(`children[${index}][occupation]`) || null
        });
      }
    });

    // Append JSON data
    formData.append("members", JSON.stringify(members));
    formData.append("husband_name", husbandName);

    try {
      const response = await fetch("/save-family", {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      const text = await response.text(); // FIRST read raw response

      let result;
      try {
        result = JSON.parse(text); // Try to parse manually
      } catch (err) {
        console.error("Server did NOT return JSON. Raw response:", text);
        alert("Server error: Invalid response from server. Check backend.");
        return;
      }

      if (result.success && result.exists) {
        window.location.href = "/my-family";
      } else if (result.success) {
        alert("Family saved successfully ✅");
        window.location.href = "/dashboard";
      } else {
        alert(result.message || "Failed to save family");
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      alert("Server not reachable");
    }
  });
});
