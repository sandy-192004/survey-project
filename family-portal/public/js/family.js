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

let childCount = 0;

function addChild() {
  const id = `child_${childCount++}`;
  const html = `
    <div class="border p-2 mb-2" id="${id}">
      <input class="form-control mb-1" name="children[][name]" placeholder="Child Name" required>
      <input class="form-control mb-1" name="children[][dob]" type="date" placeholder="Date of Birth">
      <input class="form-control mb-1" name="children[][occupation]" placeholder="Occupation">
      <button type="button" class="btn btn-danger btn-sm" onclick="removeChild('${id}')">Remove</button>
    </div>
  `;
  document.getElementById("children").insertAdjacentHTML("beforeend", html);
}

function removeChild(id) {
  const element = document.getElementById(id);
  if (element) {
    element.remove();
  }
}

window.onload = loadIndiaData;
