// let indiaData = {}

// async function loadIndiaData() {
//   const res = await fetch("/data/india-states-districts.json");
//   indiaData = await res.json();

//   const stateSelect = document.getElementById("state");
//   Object.keys(indiaData).forEach(state => {
//     const option = document.createElement("option");
//     option.value = state;
//     option.textContent = state;
//     stateSelect.appendChild(option);
//   });

//   stateSelect.addEventListener("change", function () {
//     const selectedState = this.value;
//     const districtSelect = document.getElementById("district");
//     districtSelect.innerHTML = '<option value="">Select District</option>';

//     if (selectedState && indiaData[selectedState]) {
//       indiaData[selectedState].forEach(district => {
//         const option = document.createElement("option");
//         option.value = district;
//         option.textContent = district;
//         districtSelect.appendChild(option);
//       });
//     }
//   });
// }

// let childIndex = 0;
// function addChild() {
//   const container = document.getElementById("children");
//   const html = `
//   <div class="card p-3 mb-2 child-card" id="child-${childIndex}">
//     <div class="d-flex justify-content-between align-items-center mb-2">
//       <h6 class="mb-0">Child</h6>
//       <button type="button" class="btn btn-danger btn-sm" onclick="removeChildRow(${childIndex})">❌ Remove</button>
//     </div>
//     <input class="form-control mb-2 small" name="children[${childIndex}][name]" placeholder="Child Name" required>
//     <input type="date" class="form-control mb-2 small" name="children[${childIndex}][dob]">
//     <select class="form-control mb-2 small" name="children[${childIndex}][gender]">
//       <option value="">Select Gender</option>
//       <option value="Male">Male</option>
//       <option value="Female">Female</option>
//       <option value="Other">Other</option>
//     </select>
//     <input class="form-control mb-2 small" name="children[${childIndex}][occupation]" placeholder="Occupation">
//     <select class="form-control mb-2 small" name="children[${childIndex}][relationship]">
//       <option value="">Relationship</option>
//       <option value="son">Son</option>
//       <option value="daughter">Daughter</option>
//     </select>
//     <div class="d-flex gap-2 mb-2">
//       <button type="button" class="btn btn-outline-primary btn-sm" onclick="selectPhoto('child_${childIndex}')">Select Photo</button>
//       <button type="button" class="btn btn-outline-success btn-sm" onclick="capturePhoto('child_${childIndex}')">Capture Photo</button>
//     </div>
//     <input type="file" id="child_${childIndex}_file" class="form-control small d-none" name="children[${childIndex}][photo]" accept="image/*" onchange="handlePhotoSelect(this, 'child_${childIndex}_preview')">
//     <div id="child_${childIndex}_size" class="small text-muted"></div>
//     <img id="child_${childIndex}_preview" class="img-thumbnail">
//   </div>`;
//   container.insertAdjacentHTML("beforeend", html);
//   childIndex++;
// }

// function removeChildRow(index) {
//   const el = document.getElementById(`child-${index}`);
//   if (el && el.parentNode) el.parentNode.removeChild(el);
// }

// window.addEventListener("DOMContentLoaded", loadIndiaData);

// // ================== ADD CHILD MODAL HANDLING ==================
// document.addEventListener("DOMContentLoaded", () => {
//   const addChildForm = document.getElementById("addChildForm");
//   if (addChildForm) {
//     addChildForm.addEventListener("submit", async (e) => {
//       e.preventDefault();

//       const formData = new FormData(addChildForm);

//       try {
//         const response = await fetch("/add-child", {
//           method: "POST",
//           body: formData,
//           credentials: "include"
//         });

//         const result = await response.json();

//         if (result.success) {
//           // Close modal
//           const modal = bootstrap.Modal.getInstance(document.getElementById("addChildModal"));
//           modal.hide();

//           // Reset form
//           addChildForm.reset();

//           // Show success message and reload page
//           if (typeof Swal !== 'undefined') {
//             Swal.fire({
//               icon: 'success',
//               title: 'Child Added Successfully!',
//               text: result.message,
//               showConfirmButton: false,
//               timer: 1500
//             }).then(() => {
//               // Reload page to show new child
//               window.location.reload();
//             });
//           } else {
//             alert('Child Added Successfully!');
//             window.location.reload();
//           }
//         } else {
//           if (typeof Swal !== 'undefined') {
//             Swal.fire({
//               icon: 'error',
//               title: 'Failed to Add Child',
//               text: result.message || 'An error occurred'
//             });
//           } else {
//             alert('Failed to Add Child: ' + (result.message || 'An error occurred'));
//           }
//         }
//       } catch (error) {
//         console.error("Add child error:", error);
//         Swal.fire({
//           icon: 'error',
//           title: 'Network Error',
//           text: 'Failed to connect to server'
//         });
//       }
//     });
//   }

//   // Load states when add child modal is shown
//   const addChildModal = document.getElementById("addChildModal");
//   if (addChildModal) {
//     addChildModal.addEventListener('show.bs.modal', () => {
//       loadStatesForChildModal();
//     });
//   }
// });

// async function loadStatesForChildModal() {
//   const stateSelect = document.getElementById("childState");
//   if (!stateSelect) return;

//   try {
//     const res = await fetch("/data/india-states-districts.json");
//     indiaData = await res.json();

//     Object.keys(indiaData).forEach(state => {
//       const option = document.createElement("option");
//       option.value = state;
//       option.textContent = state;
//       stateSelect.appendChild(option);
//     });

//     stateSelect.addEventListener("change", function () {
//       const selectedState = this.value;
//       const districtSelect = document.getElementById("childDistrict");
//       districtSelect.innerHTML = '<option value="">Select District</option>';

//       if (selectedState && indiaData[selectedState]) {
//         indiaData[selectedState].forEach(district => {
//           const option = document.createElement("option");
//           option.value = district;
//           option.textContent = district;
//           districtSelect.appendChild(option);
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Error loading states for child modal:", error);
//   }
// }

// // ================== FORM SUBMIT ==================
// document.addEventListener("DOMContentLoaded", () => {
//   const form = document.getElementById("familyForm");
//   if (!form) {
//     console.error("familyForm not found");
//     return;
//   }

//   form.addEventListener("submit", async (e) => {
//     e.preventDefault();

//     const formData = new FormData(form);
//     const members = [];

//     // Add husband
//     const husbandName = formData.get("husband_name");
//     if (husbandName) {
//       members.push({
//         member_type: "parent",
//         name: husbandName,
//         relationship: "husband",
//         gender: formData.get("parent[husband_gender]") || "male",
//         mobile: formData.get("parent[mobile]") || null,
//         occupation: formData.get("parent[occupation]") || null,
//         door_no: formData.get("parent[door_no]") || null,
//         street: formData.get("parent[street]") || null,
//         district: formData.get("parent[district]") || null,
//         state: formData.get("parent[state]") || null,
//         pincode: formData.get("parent[pincode]") || null
//       });
//     }

//     // Add wife
//     const wifeName = formData.get("parent[wife_name]");
//     if (wifeName) {
//       members.push({
//         member_type: "parent",
//         name: wifeName,
//         relationship: "wife",
//         gender: formData.get("parent[wife_gender]") || "female",
//         mobile: formData.get("parent[mobile_wife]") || null,
//         occupation: formData.get("parent[occupation_wife]") || null,
//         door_no: formData.get("parent[door_no]") || null,
//         street: formData.get("parent[street]") || null,
//         district: formData.get("parent[district]") || null,
//         state: formData.get("parent[state]") || null,
//         pincode: formData.get("parent[pincode]") || null
//       });
//     }

//     // Add children
//     const childrenContainer = document.getElementById("children");
//     const childCards = childrenContainer.querySelectorAll(".child-card");
//     childCards.forEach((card, index) => {
//       const childName = formData.get(`children[${index}][name]`);
//       if (childName) {
//         members.push({
//           member_type: "child",
//           name: childName,
//           relationship: formData.get(`children[${index}][relationship]`) || null,
//           dob: formData.get(`children[${index}][dob]`) || null,
//           gender: formData.get(`children[${index}][gender]`) || null,
//           occupation: formData.get(`children[${index}][occupation]`) || null
//         });
//       }
//     });

//     // Append JSON data
//     formData.append("members", JSON.stringify(members));
//     formData.append("husband_name", husbandName);

//     try {
//       const response = await fetch("/save-family", {
//         method: "POST",
//         body: formData,
//         credentials: "include"
//       });

//       const text = await response.text(); // FIRST read raw response

//       let result;
//       try {
//         result = JSON.parse(text); // Try to parse manually
//       } catch (err) {
//         console.error("Server did NOT return JSON. Raw response:", text);
//         alert("Server error: Invalid response from server. Check backend.");
//         return;
//       }

//       if (result.success && result.exists) {
//         window.location.href = "/my-family";
//       } else if (result.success) {
//         Swal.fire({
//           icon: 'success',
//           title: 'Family Saved Successfully!',
//           text: 'Your family details including children have been saved.',
//           showConfirmButton: false,
//           timer: 3000
//         }).then(() => {
//           window.location.href = "/dashboard";
//         });
//       } else {
//         Swal.fire({
//           icon: 'error',
//           title: 'Failed to Save Family',
//           text: result.message || 'An error occurred'
//         });
//       }
//     } catch (error) {
//       console.error("Network error:", error);
//       alert("Server not reachable");
//     }
//   });
// });



























// ========== GLOBAL DATA ==========
if (typeof indiaData === "undefined") {
  var indiaData = {};
}

let childIndex = 0;

// ========== LOAD INDIA DATA ==========
async function loadIndiaData() {
  try {
    const res = await fetch("/data/india-states-districts.json");
    indiaData = await res.json();

    const stateSelect = document.getElementById("state");
    if (!stateSelect) return;

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
  } catch (err) {
    console.error("Error loading India data:", err);
  }
}

// ========== ADD & REMOVE CHILD ==========
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

    <h6 class="mt-3 mb-2 small">Address</h6>
    <div class="form-check mb-2">
      <input class="form-check-input" type="checkbox" id="sameAddressCheck_${childIndex}" onchange="handleSameAddressCheck(${childIndex})">
      <label class="form-check-label" for="sameAddressCheck_${childIndex}">
        Same as Parent Address
      </label>
    </div>
    <input type="hidden" name="children[${childIndex}][use_parent_address]" id="use_parent_address_${childIndex}" value="false">
    <div class="row g-2 mb-2">
      <div class="col-12 col-md-6">
        <input class="form-control mb-2 small" name="children[${childIndex}][door_no]" id="child_${childIndex}_door_no" placeholder="Door No">
        <input class="form-control mb-2 small" name="children[${childIndex}][street]" id="child_${childIndex}_street" placeholder="Street">
      </div>
      <div class="col-12 col-md-6">
        <select class="form-control mb-2 small" name="children[${childIndex}][state]" id="child_${childIndex}_state" onchange="loadDistrictsForChild(${childIndex})">
          <option value="">Select State</option>
        </select>
        <select class="form-control mb-2 small" name="children[${childIndex}][district]" id="child_${childIndex}_district">
          <option value="">Select District</option>
        </select>
      </div>
    </div>
    <input class="form-control mb-2 small" name="children[${childIndex}][pincode]" id="child_${childIndex}_pincode" placeholder="Pincode" type="text">

    <h6 class="mt-3 mb-2 small">Photo</h6>
    <input type="file" id="child_${childIndex}_file" class="form-control small d-none" name="children[${childIndex}][photo]" accept="image/*" onchange="handleChildPhotoSelect(this, ${childIndex})">
    <div id="child_${childIndex}_file_info" class="small text-muted d-flex align-items-center">
      <span id="child_${childIndex}_file_name"></span>
      <span id="child_${childIndex}_file_size"></span>
      <i id="child_${childIndex}_delete" class="bi bi-trash ms-2 text-danger" style="cursor: pointer; display: none;" onclick="deleteChildPhoto(${childIndex})"></i>
    </div>
    <div id="child_${childIndex}_placeholder" class="d-flex align-items-center justify-content-center position-relative" style="height: 100px; background-color: #f8f9fa; border: 1px dashed #dee2e6; cursor: pointer;" onclick="showPhotoOptions('child_${childIndex}')">
      <span class="text-muted">Click to upload or capture photo</span>
    </div>
  </div>`;
  container.insertAdjacentHTML("beforeend", html);

  // Load states for this child
  loadStatesForChild(childIndex);

  childIndex++;
}

function removeChildRow(index) {
  const el = document.getElementById(`child-${index}`);
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ========== LOAD CHILD MODAL STATES ==========
async function loadStatesForChildModal() {
  const stateSelect = document.getElementById("childState");
  if (!stateSelect) return;

  try {
    const res = await fetch("/data/india-states-districts.json");
    indiaData = await res.json();

    Object.keys(indiaData).forEach(state => {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      stateSelect.appendChild(option);
    });

    stateSelect.addEventListener("change", function () {
      const selectedState = this.value;
      const districtSelect = document.getElementById("childDistrict");
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
  } catch (error) {
    console.error("Error loading states for child modal:", error);
  }
}



// ================== CHILD ADDRESS AND PHOTO FUNCTIONS ==================

function handleSameAddressCheck(childIndex) {
  const checkbox = document.getElementById(`sameAddressCheck_${childIndex}`);
  const hiddenFlag = document.getElementById(`use_parent_address_${childIndex}`);
  const doorNo = document.getElementById(`child_${childIndex}_door_no`);
  const street = document.getElementById(`child_${childIndex}_street`);
  const state = document.getElementById(`child_${childIndex}_state`);
  const district = document.getElementById(`child_${childIndex}_district`);
  const pincode = document.getElementById(`child_${childIndex}_pincode`);

  if (checkbox.checked) {
    // Copy parent address
    const parentDoorNo = document.querySelector('input[name="parent[door_no]"]').value;
    const parentStreet = document.querySelector('input[name="parent[street]"]').value;
    const parentState = document.querySelector('select[name="parent[state]"]').value;
    const parentDistrict = document.querySelector('select[name="parent[district]"]').value;
    const parentPincode = document.querySelector('input[name="parent[pincode]"]').value;

    doorNo.value = parentDoorNo;
    street.value = parentStreet;
    state.value = parentState;
    pincode.value = parentPincode;

    // Load districts for the selected state
    loadDistrictsForChild(childIndex);
    // After loading districts, set the district value
    setTimeout(() => {
      district.value = parentDistrict;
    }, 100);

    // Make inputs readonly but keep selects enabled for form submission
    doorNo.readOnly = true;
    street.readOnly = true;
    state.style.pointerEvents = 'none'; // Prevent interaction
    state.style.opacity = '0.6'; // Visual indication
    district.style.pointerEvents = 'none';
    district.style.opacity = '0.6';
    pincode.readOnly = true;

    // Set flag
    hiddenFlag.value = "true";
  } else {
    // Clear and enable inputs
    doorNo.value = '';
    street.value = '';
    state.value = '';
    district.value = '';
    pincode.value = '';

    doorNo.readOnly = false;
    street.readOnly = false;
    state.style.pointerEvents = 'auto';
    state.style.opacity = '1';
    district.style.pointerEvents = 'auto';
    district.style.opacity = '1';
    pincode.readOnly = false;

    // Reset flag
    hiddenFlag.value = "false";
  }
}

async function loadStatesForChild(childIndex) {
  const stateSelect = document.getElementById(`child_${childIndex}_state`);
  if (!stateSelect || stateSelect.options.length > 1) return; // Already loaded

  try {
    const res = await fetch("/data/india-states-districts.json");
    const indiaData = await res.json();

    Object.keys(indiaData).forEach(state => {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      stateSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading states for child:", error);
  }
}

function loadDistrictsForChild(childIndex) {
  const stateSelect = document.getElementById(`child_${childIndex}_state`);
  const districtSelect = document.getElementById(`child_${childIndex}_district`);
  const selectedState = stateSelect.value;

  districtSelect.innerHTML = '<option value="">Select District</option>';

  if (selectedState && indiaData[selectedState]) {
    indiaData[selectedState].forEach(district => {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      districtSelect.appendChild(option);
    });
  }
}

function handleChildPhotoSelect(input, childIndex) {
  if (input.files && input.files[0]) {
    const file = input.files[0];

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please choose a smaller file.');
      input.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG and WebP formats are allowed.');
      input.value = '';
      return;
    }

    const fileNameSpan = document.getElementById(`child_${childIndex}_file_name`);
    const fileSizeSpan = document.getElementById(`child_${childIndex}_file_size`);
    const deleteIcon = document.getElementById(`child_${childIndex}_delete`);
    const placeholder = document.getElementById(`child_${childIndex}_placeholder`);

    fileNameSpan.textContent = file.name;
    fileSizeSpan.textContent = ` – ${(file.size / 1024).toFixed(2)} KB`;
    deleteIcon.style.display = 'inline';
    placeholder.style.display = 'none';
  }
}

function deleteChildPhoto(childIndex) {
  const fileInput = document.getElementById(`child_${childIndex}_file`);
  const fileNameSpan = document.getElementById(`child_${childIndex}_file_name`);
  const fileSizeSpan = document.getElementById(`child_${childIndex}_file_size`);
  const deleteIcon = document.getElementById(`child_${childIndex}_delete`);
  const placeholder = document.getElementById(`child_${childIndex}_placeholder`);

  fileInput.value = '';
  fileNameSpan.textContent = '';
  fileSizeSpan.textContent = '';
  deleteIcon.style.display = 'none';
  placeholder.style.display = 'flex';
}

// ================== FORM SUBMIT ==================

document.addEventListener("DOMContentLoaded", () => {
  // Load initial India data
  loadIndiaData();

  // ========== ADD CHILD FORM SUBMIT ==========
  const addChildForm = document.getElementById("addChildForm");
  if (addChildForm) {
    addChildForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(addChildForm);

      try {
        const response = await fetch("/add-child", {
          method: "POST",
          body: formData,
          credentials: "include"
        });

        const result = await response.json();
        if (result.success) {
          const modal = bootstrap.Modal.getInstance(document.getElementById("addChildModal"));
          modal.hide();
          addChildForm.reset();

          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'success',
              title: 'Child Added Successfully!',
              text: result.message,
              showConfirmButton: false,
              timer: 1500
            }).then(() => window.location.reload());
          } else {
            alert('Child Added Successfully!');
            window.location.reload();
          }
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Failed to Add Child',
            text: result.message || 'An error occurred'
          });
        }
      } catch (error) {
        console.error("Add child error:", error);
        Swal.fire({
          icon: 'error',
          title: 'Network Error',
          text: 'Failed to connect to server'
        });
      }
    });
  }

  // ========== LOAD CHILD MODAL STATES ==========
  const addChildModal = document.getElementById("addChildModal");
  if (addChildModal) {
    addChildModal.addEventListener('show.bs.modal', () => {
      loadStatesForChildModal();
    });
  }

  // ========== FAMILY FORM SUBMIT ==========
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
        gender: formData.get("parent[husband_gender]") || "male",
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
        gender: formData.get("parent[wife_gender]") || "female",
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
          occupation: formData.get(`children[${index}][occupation]`) || null,
          door_no: formData.get(`children[${index}][door_no]`) || null,
          street: formData.get(`children[${index}][street]`) || null,
          district: formData.get(`children[${index}][district]`) || null,
          state: formData.get(`children[${index}][state]`) || null,
          pincode: formData.get(`children[${index}][pincode]`) || null,
          use_parent_address: formData.get(`children[${index}][use_parent_address]`) === "true"
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

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (err) {
        console.error("Server did NOT return JSON. Raw response:", text);
        alert("Server error: Invalid response from server. Check backend.");
        return;
      }

      if (result.success && result.exists) {
        window.location.href = "/my-family";
      } else if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Family Saved Successfully!',
          text: 'Your family details including children have been saved.',
          showConfirmButton: false,
          timer: 3000
        }).then(() => {
          window.location.href = "/dashboard";
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to Save Family',
          text: result.message || 'An error occurred'
        });
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Server not reachable");
    }
  });
});

// ================== EDIT MODAL HANDLING ==================
async function openEditModal(relationship, memberId) {
  try {
    // Fetch member data
    const response = await fetch(`/my-family-json`, {
      method: 'GET',
      credentials: 'include'
    });

    const result = await response.json();
    if (!result.success) {
      alert('Failed to load member data');
      return;
    }

    // Find the specific member
    const member = result.members.find(m => m.id == memberId);
    if (!member) {
      alert('Member not found');
      return;
    }

    // Determine modal and form based on relationship
    let modalId, formId, photoPreviewId;
    if (relationship === 'husband') {
      modalId = 'husbandEditModal';
      formId = 'husbandEditForm';
      photoPreviewId = 'husbandPhotoPreview';
    } else if (relationship === 'wife') {
      modalId = 'wifeEditModal';
      formId = 'wifeEditForm';
      photoPreviewId = 'wifePhotoPreview';
    } else if (relationship === 'child') {
      modalId = 'childEditModal';
      formId = 'childEditForm';
      photoPreviewId = 'childPhotoPreview';
    } else {
      alert('Unknown relationship type');
      return;
    }

    // Populate form with member data
    const form = document.getElementById(formId);
    form.querySelector('[name="name"]').value = member.name || '';
    form.querySelector('[name="mobile"]').value = member.mobile || '';
    form.querySelector('[name="occupation"]').value = member.occupation || '';
    form.querySelector('[name="door_no"]').value = member.door_no || '';
    form.querySelector('[name="street"]').value = member.street || '';
    form.querySelector('[name="pincode"]').value = member.pincode || '';
    form.querySelector('[name="state"]').value = member.state || '';
    form.querySelector('[name="district"]').value = member.district || '';

    // Handle child-specific fields
    if (relationship === 'child') {
      form.querySelector('[name="member_id"]').value = memberId;
      form.querySelector('[name="dob"]').value = member.dob ? new Date(member.dob).toISOString().split('T')[0] : '';
      form.querySelector('[name="gender"]').value = member.gender || '';
      form.querySelector('[name="relationship"]').value = member.relationship || '';
    }

    // Handle photo preview
    const photoPreview = document.getElementById(photoPreviewId);
    if (member.photo && member.photo.trim() !== '') {
      let photoSrc = member.photo;
      const sizeMatch = photoSrc.match(/^(.+)\(\d+\)$/);
      if (sizeMatch) photoSrc = sizeMatch[1];
      if (photoSrc.startsWith('/')) photoSrc = photoSrc.substring(1);
      if (photoSrc.startsWith('uploads/')) {
        photoPreview.src = '/' + photoSrc;
      } else {
        photoPreview.src = '/uploads/' + photoSrc;
      }
      photoPreview.style.display = 'block';
    } else {
      photoPreview.style.display = 'none';
    }

    // Load states for the modal
    if (relationship === 'husband') {
      await loadStatesForModal('husbandState', 'husbandDistrict', member.state, member.district);
    } else if (relationship === 'wife') {
      await loadStatesForModal('wifeState', 'wifeDistrict', member.state, member.district);
    } else if (relationship === 'child') {
      await loadStatesForModal('editChildState', 'editChildDistrict', member.state, member.district);
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();

  } catch (error) {
    console.error('Error opening edit modal:', error);
    alert('Failed to open edit modal');
  }
}

async function loadStatesForModal(stateSelectId, districtSelectId, selectedState, selectedDistrict) {
  const stateSelect = document.getElementById(stateSelectId);
  const districtSelect = document.getElementById(districtSelectId);

  try {
    const res = await fetch("/data/india-states-districts.json");
    const indiaData = await res.json();

    // Clear existing options
    stateSelect.innerHTML = '<option value="">Select State</option>';
    districtSelect.innerHTML = '<option value="">Select District</option>';

    // Add states
    Object.keys(indiaData).forEach(state => {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      if (state === selectedState) option.selected = true;
      stateSelect.appendChild(option);
    });

    // Load districts if state is selected
    if (selectedState && indiaData[selectedState]) {
      indiaData[selectedState].forEach(district => {
        const option = document.createElement("option");
        option.value = district;
        option.textContent = district;
        if (district === selectedDistrict) option.selected = true;
        districtSelect.appendChild(option);
      });
    }

    // Add change event listener
    stateSelect.addEventListener("change", function () {
      const selectedState = this.value;
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

  } catch (error) {
    console.error("Error loading states for modal:", error);
  }
}

// ================== EDIT FORM SUBMISSION ==================
document.addEventListener("DOMContentLoaded", () => {
  // Husband edit form
  const husbandEditForm = document.getElementById("husbandEditForm");
  if (husbandEditForm) {
    husbandEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitEditForm('husbandEditForm', 'husbandEditModal', 'husband');
    });
  }

  // Wife edit form
  const wifeEditForm = document.getElementById("wifeEditForm");
  if (wifeEditForm) {
    wifeEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitEditForm('wifeEditForm', 'wifeEditModal', 'wife');
    });
  }

  // Child edit form
  const childEditForm = document.getElementById("childEditForm");
  if (childEditForm) {
    childEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const memberId = childEditForm.querySelector('[name="member_id"]').value;
      await submitEditForm('childEditForm', 'childEditModal', 'child', memberId);
    });
  }
});

async function submitEditForm(formId, modalId, type, memberId) {
  const form = document.getElementById(formId);
  const formData = new FormData(form);

  // Add member type
  formData.append('member_type', type === 'child' ? 'child' : 'parent');

  try {
    let url, method;
    if (type === 'husband' || type === 'wife') {
      url = '/update-family';
      method = 'POST';
    } else {
      // For children, use the memberId passed as parameter
      url = `/update-child/${memberId}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method: method,
      body: formData,
      credentials: 'include'
    });

    const result = await response.json();

    if (result.success) {
      // Close modal
      const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
      modal.hide();

      // Show success message
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'success',
          title: 'Updated Successfully!',
          text: 'Member details have been updated.',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          // Reload page to show updated data
          window.location.reload();
        });
      } else {
        alert('Updated Successfully!');
        window.location.reload();
      }
    } else {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: result.message || 'An error occurred'
        });
      } else {
        alert('Update Failed: ' + (result.message || 'An error occurred'));
      }
    }
  } catch (error) {
    console.error("Update error:", error);
    Swal.fire({
      icon: 'error',
      title: 'Network Error',
      text: 'Failed to connect to server'
    });
  }
}
