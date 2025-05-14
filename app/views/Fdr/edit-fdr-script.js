function setClause() {
  let $dropdown = $("#doc_interest_payout_clause");

  $dropdown.select2({
    width: "100%",
    tags: true,
    placeholder: "Select or Enter Beneficiary Name",
    allowClear: true,
    createTag: function (params) {
      var term = $.trim(params.term);
      var exists = false;

      $("#doc_interest_payout_clause option").each(function () {
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
        url: "/fdr/save-clause/",
        method: "POST",
        data: { clause_name: selectedValue },
        success: function (response) {
          if (response.status == 1) {
            getAllClause();
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

function getAllClause() {
  const url = `/fdr/get-all-clause`;
  $.ajax({
    url: url,
    type: "GET",
    success: function (response) {
      console.log(response);
      if (response.status === 1) {
        let $dropdown = $("#doc_interest_payout_clause");

        let currentValue = $dropdown.val();
        $dropdown.select2("destroy").empty();
        response.data.forEach((data) => {
          let option = `<option value="${data.clause_name}">
                                    ${data.clause_name}
                                  </option>`;
          $dropdown.append(option);
        });

        // Reinitialize Select2
        setClause();

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
  setClause();
});
