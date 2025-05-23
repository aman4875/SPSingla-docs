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
            console.log(response);
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
            console.log(response);
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

$(document).ready(() => {
    const $input = $("#doc_bg_commission");
    $input.on("input", function () {
        let val = $(this)
            .val()
            .replace(/[^0-9]/g, ""); // Remove non-digits
        $(this).data("raw", val); // Store the raw number without %
    });
    $input.on("focus", function () {
        // Remove % on focus
        let val = $(this).val().replace("%", "");
        $(this).val(val);
    });

    $input.on("blur", function () {
        let val = $(this).data("raw") || "";
        if (val !== "") {
            val = Math.min(100, parseInt(val));
            $(this).val(val + "%");
        } else {
            $(this).val("");
        }
    });
});

$(document).ready(() => {
    const $input = $("#doc_required_margin");
    $input.on("input", function () {
        let val = $(this)
            .val()
            .replace(/[^0-9]/g, ""); // Remove non-digits
        $(this).data("raw", val); // Store the raw number without %
    });
    $input.on("focus", function () {
        // Remove % on focus
        let val = $(this).val().replace("%", "");
        $(this).val(val);
    });

    $input.on("blur", function () {
        let val = $(this).data("raw") || "";
        if (val !== "") {
            val = Math.min(100, parseInt(val));
            $(this).val(val + "%");
        } else {
            $(this).val("");
        }
    });
});

$(document).ready(() => {
    function parseDDMMYYYY(dateStr) {
        const parts = dateStr.split("/");
        if (parts.length !== 3) return null;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-based
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }

    function calculateCommission() {
        const rawClaimDate = $("#doc_claim_date").val();
        console.log("🚀 ~ calculateCommission ~ rawClaimDate:", rawClaimDate);
        const rawIssueDate = $("#doc_issue_date").val();
        console.log("🚀 ~ calculateCommission ~ rawIssueDate:", rawIssueDate);

        const claimDate = parseDDMMYYYY(rawClaimDate);

        const issueDate = parseDDMMYYYY(rawIssueDate);

        if (
            !claimDate ||
            !issueDate ||
            isNaN(claimDate.getTime()) ||
            isNaN(issueDate.getTime())
        )
            return;

        const days = (claimDate - issueDate) / (1000 * 60 * 60 * 24);

        let bgCommissionRaw = $("#doc_bg_commission").val().replace("%", "");
        const bgCommission = parseFloat(0.1) / 100;
        const bgAmount = parseFloat($("#doc_bg_amount").val());

        if (!isNaN(days) && !isNaN(bgCommission) && !isNaN(bgAmount)) {
            const result = (days / 365) * bgCommission * bgAmount;
            $("#doc_commission_amount").val(result.toFixed(2));
        }
    }

    $("#doc_claim_date, #doc_issue_date, #doc_bg_commission, #doc_bg_amount").on(
        "input change",
        calculateCommission
    );
});
$(document).ready(() => {

    function calculateMargin() {
        
    }

    const bgAmount = parseFloat($("#doc_bg_amount").val());
    console.log("🚀 ~ $ ~ bgAmount:", bgAmount)
    const requiredMargin = parseFloat($("#doc_required_margin").val());
    console.log("🚀 ~ $ ~ requiredMargin:", requiredMargin)


    $("#doc_bg_amount, #doc_required_margin").on(
        "input change",
        calculateMargin(bgAmount,requiredMargin)
    );
});
