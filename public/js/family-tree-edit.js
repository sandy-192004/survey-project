// =============================================
// FAMILY TREE MANAGEMENT - JAVASCRIPT
// =============================================

// ========== GLOBAL DATA ==========
if (typeof indiaData === "undefined") {
  var indiaData = {};
}

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
      <h6 class="mb-0">Child ${childIndex + 1}</h6>
      <button type="button" class="btn btn-danger btn-sm" onclick="removeChildRow(${childIndex})">❌ Remove</button>
    </div>
    <input class="form-control mb-2 small" name="children[${childIndex}][name]" placeholder="Child Name" required>
    <div class="row g-2">
      <div class="col-6">
        <input type="date" class="form-control mb-2 small" name="children[${childIndex}][dob]">
      </div>
      <div class="col-6">
        <select class="form-control mb-2 small" name="children[${childIndex}][gender]">
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>
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
        <select class="form-control mb-2 small" name="children[${childIndex}][state]" id="child_${childIndex}_state">
          <option value="">Select State</option>
        </select>
        <select class="form-control mb-2 small" name="children[${childIndex}][district]" id="child_${childIndex}_district">
          <option value="">Select District</option>
        </select>
      </div>
    </div>
    <input class="form-control mb-2 small" name="children[${childIndex}][pincode]" id="child_${childIndex}_pincode" placeholder="Pincode" type="text">

    <h6 class="mt-3 mb-2 small">Photo</h6>
    <input type="file" id="child_${childIndex}_file" class="form-control small d-none" 
           name="children[${childIndex}][photo]" accept="image/*"
           onchange="handlePhotoSelect(this, 'child_${childIndex}')">
    <div id="child_${childIndex}_placeholder" class="d-flex align-items-center justify-content-center position-relative" 
         style="height: 100px; background-color: #f8f9fa; border: 1px dashed #dee2e6; cursor: pointer;" 
         onclick="showPhotoOptions('child_${childIndex}')">
      <span class="text-muted">Click to upload photo</span>
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
  reIndexChildren();
}

function reIndexChildren() {
  const childrenContainer = document.getElementById("children");
  const childCards = childrenContainer.querySelectorAll(".child-card");
  childCards.forEach((card, newIndex) => {
    card.id = `child-${newIndex}`;
    const inputs = card.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.name) {
        input.name = input.name.replace(/children\[\d+\]/, `children[${newIndex}]`);
      }
    });
  });
}

// ========== LOAD CHILD STATES ==========
async function loadStatesForChild(childIndex) {
  const stateSelect = document.getElementById(`child_${childIndex}_state`);
  if (!stateSelect || stateSelect.options.length > 1) return;

  try {
    const res = await fetch("/data/india-states-districts.json");
    const data = await res.json();

    Object.keys(data).forEach(state => {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      stateSelect.appendChild(option);
    });

    stateSelect.addEventListener("change", function () {
      const districtSelect = document.getElementById(`child_${childIndex}_district`);
      districtSelect.innerHTML = '<option value="">Select District</option>';

      if (this.value && data[this.value]) {
        data[this.value].forEach(district => {
          const option = document.createElement("option");
          option.value = district;
          option.textContent = district;
          districtSelect.appendChild(option);
        });
      }
    });
  } catch (error) {
    console.error("Error loading states:", error);
  }
}

// ========== PHOTO HANDLING ==========
let currentPhotoTarget = null;
let cameraStream = null;

// Helper function to get file input ID based on target
function getFileInputId(target) {
  // For children and siblings, the ID is already target_file
  if (target.startsWith('child_') || target.startsWith('sibling_')) {
    return `${target}_file`;
  }
  // For other targets (husband, wife, etc.), append _photo_file
  return `${target}_photo_file`;
}

function showPhotoOptions(target) {
  currentPhotoTarget = target;
  Swal.fire({
    title: 'Choose Photo Option',
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: 'Upload Photo',
    denyButtonText: 'Take Photo',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#6f4e37',
    denyButtonColor: '#6f4e37'
  }).then((result) => {
    if (result.isConfirmed) {
      const fileInputId = getFileInputId(target);
      const fileInput = document.getElementById(fileInputId);
      if (fileInput) {
        fileInput.click();
      } else {
        console.error('File input not found:', fileInputId);
      }
    } else if (result.isDenied) {
      openCamera(target);
    }
  });
}

function openCamera(target) {
  Swal.fire({
    title: 'Capture Photo',
    html: '<video id="cameraVideo" autoplay playsinline style="width: 100%; max-width: 400px; border-radius: 8px;"></video>',
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-camera"></i> Capture',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#6f4e37',
    didOpen: () => {
      // Prefer rear camera if available, otherwise fallback to any video
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
        .then(stream => {
          cameraStream = stream;
          document.getElementById('cameraVideo').srcObject = stream;
        })
        .catch(err => {
          console.error('Camera error:', err);
          Swal.fire('Error', 'Unable to access camera', 'error');
        });
    },
    preConfirm: () => {
      const video = document.getElementById('cameraVideo');
      if (!video || !video.videoWidth) {
        Swal.showValidationMessage('Camera not ready or video not playing.');
        return false;
      }
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });
    }
  }).then((result) => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (result.isConfirmed && result.value) {
      // Delay slightly to let the camera modal close smoothly
      setTimeout(() => {
        const file = new File([result.value], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        processPhotoFile(file, target);
      }, 100);
    }
  }).catch(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
  });
}

function processPhotoFile(file, target) {
  const maxSizeKB = 250;
  const maxSizeBytes = maxSizeKB * 1024;

  if (file.size <= maxSizeBytes) {
    updatePhotoPlaceholder(target, file.size, file);
    assignFileToInput(file, target);
  } else {
    compressImage(file, maxSizeBytes, target);
  }
}

function compressImage(file, maxSizeBytes, target) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = function () {
    let quality = 0.8;
    const compress = () => {
      let targetWidth = img.width;
      let targetHeight = img.height;
      if (targetWidth > 1200) {
        targetHeight = Math.round(targetHeight * (1200 / targetWidth));
        targetWidth = 1200;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob((blob) => {
        if (blob.size <= maxSizeBytes) {
          updatePhotoPlaceholder(target, blob.size, blob);
          assignFileToInput(blob, target);
        } else if (quality > 0.1) {
          quality -= 0.1;
          compress();
        } else {
          updatePhotoPlaceholder(target, blob.size, blob);
          assignFileToInput(blob, target);
        }
      }, 'image/jpeg', quality);
    };
    compress();
  };
  img.src = URL.createObjectURL(file);
}

function updatePhotoPlaceholder(target, sizeBytes, fileData) {
  const placeholder = document.getElementById(`${target}_placeholder`);
  if (placeholder) {
    const sizeKB = (sizeBytes / 1024).toFixed(2);
    placeholder.innerHTML = `<span class="text-success fw-bold px-2 py-1 bg-white border border-success rounded" style="font-size: 0.85rem;"><i class="bi bi-check-circle-fill me-1"></i>${sizeKB} KB</span>`;
  }
}

function assignFileToInput(file, target) {
  const input = document.getElementById(`${target}_file`);
  if (input) {
    const dt = new DataTransfer();
    dt.items.add(new File([file], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' }));
    input.files = dt.files;
  }
}

function handlePhotoSelect(input, target) {
  if (input.files && input.files[0]) {
    processPhotoFile(input.files[0], target);
  }
}

// ========== SIBLING FUNCTIONS ==========
// Handled in family-form.ejs inline script

// ========== FORM SUBMIT ==========
document.addEventListener("DOMContentLoaded", () => {
  loadIndiaData();

  const form = document.getElementById("familyForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const members = [];

      // ===== HUSBAND SIDE =====
      const husbandName = formData.get("husband_name");
      if (husbandName) {
        members.push({
          member_type: "parent",
          relation_type: "husband",
          name: husbandName,
          relationship: "husband",
          gender: formData.get("husband[gender]") || "Male",
          mobile: formData.get("husband[mobile]") || null,
          occupation: formData.get("husband[occupation]") || null,
          photo_field: "husband[photo]"
        });
      }

      // Husband Father
      const husbandFatherName = formData.get("husband[father_name]");
      if (husbandFatherName) {
        members.push({
          member_type: "parent",
          relation_type: "father",
          name: husbandFatherName,
          relationship: "father",
          gender: "Male",
          occupation: formData.get("husband[father_occupation]") || null,
          photo_field: "husband[father_photo]"
        });
      }

      // Husband Mother
      const husbandMotherName = formData.get("husband[mother_name]");
      if (husbandMotherName) {
        members.push({
          member_type: "parent",
          relation_type: "mother",
          name: husbandMotherName,
          relationship: "mother",
          gender: "Female",
          occupation: formData.get("husband[mother_occupation]") || null,
          photo_field: "husband[mother_photo]"
        });
      }

      // ===== WIFE SIDE =====
      const wifeName = formData.get("wife[name]");
      if (wifeName) {
        members.push({
          member_type: "parent",
          relation_type: "wife",
          name: wifeName,
          relationship: "wife",
          gender: formData.get("wife[gender]") || "Female",
          mobile: formData.get("wife[mobile]") || null,
          occupation: formData.get("wife[occupation]") || null,
          photo_field: "wife[photo]"
        });
      }

      // Wife Father
      const wifeFatherName = formData.get("wife[father_name]");
      if (wifeFatherName) {
        members.push({
          member_type: "parent",
          relation_type: "father",
          name: wifeFatherName,
          relationship: "father",
          gender: "Male",
          occupation: formData.get("wife[father_occupation]") || null,
          photo_field: "wife[father_photo]"
        });
      }

      // Wife Mother
      const wifeMotherName = formData.get("wife[mother_name]");
      if (wifeMotherName) {
        members.push({
          member_type: "parent",
          relation_type: "mother",
          name: wifeMotherName,
          relationship: "mother",
          gender: "Female",
          occupation: formData.get("wife[mother_occupation]") || null,
          photo_field: "wife[mother_photo]"
        });
      }

      // ===== CHILDREN =====
      const childrenContainer = document.getElementById("children");
      const childCards = childrenContainer.querySelectorAll(".child-card");
      childCards.forEach((card, index) => {
        const childName = formData.get(`children[${index}][name]`);
        if (childName) {
          members.push({
            member_type: "child",
            relation_type: formData.get(`children[${index}][relationship]`) || "son",
            name: childName,
            relationship: formData.get(`children[${index}][relationship]`) || "son",
            dob: formData.get(`children[${index}][dob]`) || null,
            gender: formData.get(`children[${index}][gender]`) || null,
            occupation: formData.get(`children[${index}][occupation]`) || null,
            door_no: formData.get(`children[${index}][door_no]`) || null,
            street: formData.get(`children[${index}][street]`) || null,
            district: formData.get(`children[${index}][district]`) || null,
            state: formData.get(`children[${index}][state]`) || null,
            pincode: formData.get(`children[${index}][pincode]`) || null,
            photo_field: `children[${index}][photo]`
          });
        }
      });

      // ===== SIBLINGS =====
      const hasSiblings = document.getElementById('hasSiblings').checked;
      if (hasSiblings) {
        // Husband siblings
        const husbandSiblingCards = document.querySelectorAll('#husbandSiblingsContainer .sibling-card');
        husbandSiblingCards.forEach((card, index) => {
          const siblingName = formData.get(`siblings[husband][${index}][name]`);
          if (siblingName) {
            members.push({
              member_type: "sibling",
              relation_type: formData.get(`siblings[husband][${index}][relationship]`) || "brother",
              name: siblingName,
              relationship: formData.get(`siblings[husband][${index}][relationship]`) || "brother",
              gender: formData.get(`siblings[husband][${index}][gender]`) || null,
              occupation: formData.get(`siblings[husband][${index}][occupation]`) || null,
              sibling_side: "husband",
              photo_field: `siblings[husband][${index}][photo]`
            });
          }
        });

        // Wife siblings
        const wifeSiblingCards = document.querySelectorAll('#wifeSiblingsContainer .sibling-card');
        wifeSiblingCards.forEach((card, index) => {
          const siblingName = formData.get(`siblings[wife][${index}][name]`);
          if (siblingName) {
            members.push({
              member_type: "sibling",
              relation_type: formData.get(`siblings[wife][${index}][relationship]`) || "brother",
              name: siblingName,
              relationship: formData.get(`siblings[wife][${index}][relationship]`) || "brother",
              gender: formData.get(`siblings[wife][${index}][gender]`) || null,
              occupation: formData.get(`siblings[wife][${index}][occupation]`) || null,
              sibling_side: "wife",
              photo_field: `siblings[wife][${index}][photo]`
            });
          }
        });
      }

      // Address data (common for all members)
      const addressData = {
        door_no: formData.get("address[door_no]") || null,
        street: formData.get("address[street]") || null,
        district: formData.get("address[district]") || null,
        state: formData.get("address[state]") || null,
        pincode: formData.get("address[pincode]") || null
      };

      // Add address to all members
      members.forEach(m => {
        m.door_no = m.door_no || addressData.door_no;
        m.street = m.street || addressData.street;
        m.district = m.district || addressData.district;
        m.state = m.state || addressData.state;
        m.pincode = m.pincode || addressData.pincode;
      });

      // Prepare form data for submission
      const submitData = new FormData();
      submitData.append("members", JSON.stringify(members));
      submitData.append("husband_name", husbandName || "");
      submitData.append("has_siblings", hasSiblings);
      submitData.append("wife_name", wifeName || "");

      // Append all form fields
      for (let [key, value] of formData.entries()) {
        if (value instanceof File && value.name && value.size > 0) {
          submitData.append(key, value);
        } else if (!key.includes('[') && key !== 'husband_name') {
          submitData.append(key, value);
        }
      }

      try {
        const actionUrl = document.getElementById("familyForm").getAttribute("action") || "/save-family";
        const response = await fetch(actionUrl, {
          method: "POST",
          body: submitData,
          credentials: "include"
        });

        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (err) {
          console.error("Server error:", text);
          alert("Server error: Invalid response");
          return;
        }

        if (result.success) {
          if (result.exists) {
            window.location.href = "/my-family";
          } else {
            Swal.fire({
              icon: 'success',
              title: 'Family Saved!',
              text: 'Your family tree has been saved.',
              showConfirmButton: false,
              timer: 2000
            }).then(() => {
              window.location.href = "/dashboard?updated=true";
            });
          }
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message || 'Failed to save family'
          });
        }
      } catch (error) {
        console.error("Network error:", error);
        alert("Server not reachable");
      }
    });
  }
});
