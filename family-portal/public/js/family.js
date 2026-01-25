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

function addChild() {
  document.getElementById("children").insertAdjacentHTML(
    "beforeend",
    `
    <div class="border p-2 mb-2">
      <input class="form-control mb-1" name="children[][name]" placeholder="Child Name">
      <input class="form-control mb-1" name="children[][occupation]" placeholder="Occupation">
    </div>
    `
  );
}

window.onload = loadIndiaData;
