let indiaData = {};

async function loadIndiaData() {
  const res = await fetch("/data/india-states-districts.json");
  indiaData = await res.json();

  $("#state").typeahead({
    source: Object.keys(indiaData),
    afterSelect: function (state) {
      $("#district").typeahead("destroy");
      $("#district").typeahead({
        source: indiaData[state]
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
