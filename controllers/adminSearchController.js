const Admin = require("../models/admin");
const DEFAULT_PAGE_SIZE = 9;

function toPositiveInt(value, fallbackValue) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
}

function normalizeString(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function buildDashboardPayload({
  results,
  message,
  states,
  districts,
  selectedState,
  selectedDistrict,
  searchValue,
  currentPage,
  totalPages,
  req
}) {
  const safeResults = Array.isArray(results) ? results : [];
  const safeStates = Array.isArray(states) ? states : [];
  const safeDistricts = Array.isArray(districts) ? districts : [];

  return {
    results: safeResults,
    message: message || null,
    // Keep both naming styles for compatibility across views/controllers.
    states: safeStates,
    districts: safeDistricts,
    stateOptions: safeStates,
    districtOptions: safeDistricts,
    selectedDistrict: selectedDistrict || "",
    selectedState: selectedState || "",
    searchValue: searchValue || "",
    currentPage: toPositiveInt(currentPage, 1),
    totalPages: Number.isInteger(totalPages) && totalPages >= 0 ? totalPages : 0,
    user: req.user || null,
    updated: false,
    deleted: false,
    stats: {}
  };
}

async function loadDropdownOptions() {
  return new Promise((resolve) => {
    if (typeof Admin.getDropdownOptions !== "function") {
      return resolve({ states: [], districts: [] });
    }

    Admin.getDropdownOptions((err, data) => {
      if (err) {
        console.error("Error loading dropdown options:", err);
        return resolve({ states: [], districts: [] });
      }

      resolve({
        states: Array.isArray(data?.states) ? data.states : [],
        districts: Array.isArray(data?.districts) ? data.districts : []
      });
    });
  });
}

async function searchMembers(filters, page, limit) {
  return new Promise((resolve, reject) => {
    Admin.searchMembers(filters, page, limit, (err, data) => {
      if (err) {
        return reject(err);
      }

      resolve({
        results: Array.isArray(data?.results) ? data.results : [],
        totalPages:
          Number.isInteger(data?.totalPages) && data.totalPages >= 0
            ? data.totalPages
            : 0
      });
    });
  });
}

exports.searchFamilies = async (req, res) => {
  try {
    const q = normalizeString(req.query?.q);
    const state = normalizeString(req.query?.state);
    const district = normalizeString(req.query?.district);
    const page = toPositiveInt(req.query?.page, 1);
    const limit = DEFAULT_PAGE_SIZE;

    const { states, districts } = await loadDropdownOptions();

    if (!q && !state && !district) {
      return res.render(
        "admin/dashboard",
        buildDashboardPayload({
          results: [],
          message: "Please enter a search term or select filters.",
          states,
          districts,
          selectedState: "",
          selectedDistrict: "",
          searchValue: "",
          currentPage: 1,
          totalPages: 0,
          req
        })
      );
    }

    const data = await searchMembers(
      { input: q, selectedDistrict: district, selectedState: state },
      page,
      limit
    );

    return res.render(
      "admin/dashboard",
      buildDashboardPayload({
        results: data.results,
        message:
          data.results.length === 0
            ? "No families found for the search criteria."
            : null,
        states,
        districts,
        selectedState: state,
        selectedDistrict: district,
        searchValue: q,
        currentPage: page,
        totalPages: data.totalPages,
        req
      })
    );
  } catch (err) {
    console.error("Error searching families:", err);

    const { states, districts } = await loadDropdownOptions();
    return res.render(
      "admin/dashboard",
      buildDashboardPayload({
        results: [],
        message: "Error searching. Please try again.",
        states,
        districts,
        selectedState: normalizeString(req.query?.state),
        selectedDistrict: normalizeString(req.query?.district),
        searchValue: normalizeString(req.query?.q),
        currentPage: 1,
        totalPages: 0,
        req
      })
    );
  }
};
