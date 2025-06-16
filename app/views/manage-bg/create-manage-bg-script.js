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
        let val = $(this).val().replace(/[^0-9.]/g, ""); // allow digits and dot
        $(this).data("raw", val); // Store the raw value without %
    });

    $input.on("focus", function () {
        let val = $(this).val().replace("%", "");
        $(this).val(val);
    });

    $input.on("blur", function () {
        let val = $(this).data("raw") || "";
        if (val !== "") {
            val = parseFloat(val);
            if (!isNaN(val)) {
                val = val.toFixed(2);
                $(this).val(val + "%");
            } else {
                $(this).val(""); // fallback in case parseFloat fails
            }
        } else {
            $(this).val("");
        }
    });
});

$(document).ready(() => {
    const $input = $("#doc_required_margin");

    $input.on("input", function () {
        let val = $(this).val().replace(/[^0-9.]/g, ""); // allow digits and dot
        $(this).data("raw", val); // Store the raw value without %
    });

    $input.on("focus", function () {
        let val = $(this).val().replace("%", "");
        $(this).val(val);
    });

    $input.on("blur", function () {
        let val = $(this).data("raw") || "";
        if (val !== "") {
            val = parseFloat(val);
            if (!isNaN(val)) {
                val = val.toFixed(2);
                $(this).val(val + "%");
            } else {
                $(this).val(""); // fallback in case parseFloat fails
            }
        } else {
            $(this).val("");
        }
    });
});


$(document).ready(() => {
    function parseDDMMYYYY(dateStr) {
        if (typeof dateStr !== "string" || dateStr.trim() === "") {
            console.log(`Empty or invalid input: ${dateStr}`);
            return null;
        }

        const parsedDate = moment(dateStr, "DD/MM/YYYY", true);
        if (!parsedDate.isValid()) {
            console.error(`Invalid date format: ${dateStr}. Expected DD/MM/YYYY`);
            return null;
        }
        return parsedDate.startOf('day');
    }

    function calculateDaysDifference(startDate, endDate) {
        return endDate.diff(startDate, 'days')
    }

    function calculateCommission() {

        const rawClaimDate = $("#doc_claim_date").val()
        const rawIssueDate = $("#doc_issue_date").val();
        const bgCommissionRaw = $("#doc_bg_commission").val() || 0;
        const bgAmountRaw = $("#doc_bg_amount").val() || 0;

        const claimDate = parseDDMMYYYY(rawClaimDate);
        const issueDate = parseDDMMYYYY(rawIssueDate);

        if (!claimDate || !issueDate) {
            $("#error_message").text("Invalid dates. Use DD/MM/YYYY format.");
            return;
        }

        const days = calculateDaysDifference(issueDate, claimDate);
        if (days < 0) {
            $("#error_message").text("Claim date must be after issue date.");
            return;
        }

        let bgCommission;
        try {
            bgCommission = Decimal.div(bgCommissionRaw.replace("%", ""), 100);
            if (bgCommission.lte(0)) {
                $("#error_message").text("Commission percentage must be positive.");
                return;
            }
        } catch (e) {
            $("#error_message").text("Invalid commission percentage (e.g., 1 or 1%).");
            return;
        }

        let bgAmount;
        try {
            bgAmount = new Decimal(bgAmountRaw);
            if (bgAmount.lte(0)) {
                $("#error_message").text("Amount must be positive.");
                return;
            }
        } catch (e) {
            $("#error_message").text("Invalid amount.");
            return;
        }

        try {
            const daysFraction = Decimal.div(days, 365);
            const result = daysFraction.mul(bgCommission).mul(bgAmount);
            const formattedResult = result.toFixed(0);
            // console.log("Inputs:", { rawClaimDate, rawIssueDate, days, bgCommissionRaw, bgCommission: bgCommission.toString(), bgAmount: bgAmount.toString() });
            $("#doc_commission_amount").val(formattedResult);
        } catch (e) {
            $("#error_message").text("Calculation error. Check inputs.");
            console.error("Calculation error:", e);
        }
    }
    $("#doc_claim_date, #doc_issue_date, #doc_bg_commission, #doc_bg_amount").on("input change", calculateCommission);
});


$(document).ready(() => {
    function calculateMarginAmount() {
        const bgAmountStr = $("#doc_bg_amount").val().replace(/,/g, "").trim();
        const requiredMarginStr = $("#doc_required_margin").data("raw");

        if (!bgAmountStr || !requiredMarginStr) {
            $("#doc_margin_amount").val("");
            return;
        }

        const bgAmount = new Decimal(bgAmountStr);
        const requiredMarginPercent = new Decimal(requiredMarginStr).div(100);

        const marginAmount = bgAmount.mul(requiredMarginPercent);
        $("#doc_margin_amount").val(marginAmount.toFixed(0));
    }

    $("#doc_bg_amount, #doc_required_margin").on(
        "input change",
        calculateMarginAmount
    );
});

$(document).ready(() => {
    function getMarginAvailable(bankID) {

        fetch(`/fdr/get-margin-available?bank_id=${bankID}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 1) {
                    $("#doc_margin_available").val(data.totalMarginAvailable || "0");
                    console.log("Margin available:", data.totalMarginAvailable);
                } else {
                    $("#doc_margin_available").val("0");
                    console.error("Error fetching margin available:", data.message);
                }
            })
            .catch(error => {
                console.error("Error fetching margin available:", error);
                $("#doc_margin_available").val("0");
            });

    }


    $("#select_doc_bank_name").on("change", async function () {
        let val = $(this).val()
        let bankID = $(this).find("option:selected").data("bank-id");

        getMarginAvailable(bankID);

    });


})



