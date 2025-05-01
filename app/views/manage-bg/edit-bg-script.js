function setApplicant() {
  let $dropdown = $("#doc_applicant_name");

  $dropdown.select2({
    width: "100%",
    tags: true,
    placeholder: "Select or Enter Beneficiary Name",
    allowClear: true,
    createTag: function (params) {
      var term = $.trim(params.term);
      var exists = false;

      $("#doc_applicant_name option").each(function () {
        if ($(this).val().toLowerCase() === term.toLowerCase()) {
          exists = true;
          return false;
        }
      });

      if (exists) {
        return null;
      }

      return {
        id: term,
        text: term,
        newTag: true,
      };
    },
  });

  $dropdown.off("select2:select").on("select2:select", function (e) {
    var selectedValue = e.params.data.id;

    if (e.params.data.newTag) {
      $.ajax({
        url: "/docs/save-applicant/",
        method: "POST",
        data: { applicant_name: selectedValue },
        success: function (response) {
          if (response.status == 1) {
            getAllApplicantNames();
          }
        },
        error: function (error) {
          console.log("Error saving:", error);
        },
      });
    }
  });

  $dropdown.off("select2:clear").on("select2:clear", function () {
    let selectedValue = $dropdown.val();
    if (selectedValue) {
      $dropdown.find(`option[value="${selectedValue}"]`).remove();
      $dropdown.trigger("change"); // Update Select2
    }
  });
}

function getAllApplicantNames() {
  const url = `/docs/get-applican-names`;
  $.ajax({
    url: url,
    type: "GET",
    success: function (response) {
      if (response.status === 1) {
        let $dropdown = $("#doc_applicant_name");

        let currentValue = $dropdown.val();
        $dropdown.select2("destroy").empty();
        response.payload.forEach((applicant) => {
          let option = `<option value="${applicant.applicant_name}">
                                    ${applicant.applicant_name}
                                  </option>`;
          $dropdown.append(option);
        });

        // Reinitialize Select2
        setApplicant();

        // Restore previous selection
        if (currentValue) {
          $dropdown.val(currentValue).trigger("change");
        }
      }
    },
    error: function (error) {
      console.error("Error fetching:", error);
    },
  });
}

function fetchAllBeneficiary() {
  const url = `/docs/get-Beneficiary`;
  $.ajax({
    url: url,
    type: "GET",
    success: function (response) {
      if (response.status === 1) {
        let $dropdown = $("#doc_beneficiary_name");

        let currentValue = $dropdown.val();
        $dropdown.select2("destroy").empty();
        response.payload.forEach((beneficiary) => {
          let option = `<option value="${beneficiary.beneficiary_code}">
                                    ${beneficiary.beneficiary_code}
                                  </option>`;
          $dropdown.append(option);
        });

        // Reinitialize Select2
        setBeneficiary();

        // Restore previous selection
        if (currentValue) {
          $dropdown.val(currentValue).trigger("change");
        }
      }
    },
    error: function (error) {
      console.error("Error fetching:", error);
    },
  });
}

function setBeneficiary() {
  let $dropdown = $("#doc_beneficiary_name");

  $dropdown.select2({
    width: "100%",
    tags: true,
    placeholder: "Select or Enter Beneficiary Name",
    allowClear: true,
    createTag: function (params) {
      var term = $.trim(params.term);
      var exists = false;

      $("#doc_beneficiary_name option").each(function () {
        if ($(this).val().toLowerCase() === term.toLowerCase()) {
          exists = true;
          return false;
        }
      });

      if (exists) {
        return null;
      }

      return {
        id: term,
        text: term,
        newTag: true,
      };
    },
  });

  $dropdown.off("select2:select").on("select2:select", function (e) {
    var selectedValue = e.params.data.id;

    if (e.params.data.newTag) {
      $.ajax({
        url: "/docs/save-beneficiary/",
        method: "POST",
        data: { beneficiary_code: selectedValue },
        success: function (response) {
          if (response.status == 1) {
            fetchAllBeneficiary();
          }
        },
        error: function (error) {
          console.log("Error saving:", error);
        },
      });
    }
  });

  $dropdown.off("select2:clear").on("select2:clear", function () {
    let selectedValue = $dropdown.val();
    if (selectedValue) {
      $dropdown.find(`option[value="${selectedValue}"]`).remove();
      $dropdown.trigger("change"); // Update Select2
    }
  });
}

function setTypes() {
  let $dropdown = $("#doc_type");

  $dropdown.select2({
    width: "100%",
    tags: true,
    placeholder: "Select or Enter Beneficiary Name",
    allowClear: true,
    createTag: function (params) {
      var term = $.trim(params.term);
      var exists = false;

      $("#doc_type option").each(function () {
        if ($(this).val().toLowerCase() === term.toLowerCase()) {
          exists = true;
          return false;
        }
      });

      if (exists) {
        return null;
      }

      return {
        id: term,
        text: term,
        newTag: true,
      };
    },
  });

  $dropdown.off("select2:select").on("select2:select", function (e) {
    var selectedValue = e.params.data.id;

    if (e.params.data.newTag) {
      $.ajax({
        url: "/docs/save-type/",
        method: "POST",
        data: { type: selectedValue },
        success: function (response) {
          if (response.status == 1) {
            getAllTypes();
          }
        },
        error: function (error) {
          console.log("Error saving:", error);
        },
      });
    }
  });

  $dropdown.off("select2:clear").on("select2:clear", function () {
    let selectedValue = $dropdown.val();
    if (selectedValue) {
      $dropdown.find(`option[value="${selectedValue}"]`).remove();
      $dropdown.trigger("change"); // Update Select2
    }
  });
}

function getAllTypes() {
  const url = `/docs/get-all-types`;
  $.ajax({
    url: url,
    type: "GET",
    success: function (response) {
      if (response.status === 1) {
        let $dropdown = $("#doc_type");

        let currentValue = $dropdown.val();
        $dropdown.select2("destroy").empty();
        response.payload.forEach((type) => {
          let option = `<option value="${type.type_name}">
                                    ${type.type_name}
                                  </option>`;
          $dropdown.append(option);
        });

        // Reinitialize Select2
        setTypes();

        // Restore previous selection
        if (currentValue) {
          $dropdown.val(currentValue).trigger("change");
        }
      }
    },
    error: function (error) {
      console.error("Error fetching:", error);
    },
  });
}

$(document).ready(function () {
  setBeneficiary();
  setApplicant();
  setTypes();
});
