$(document).ready(function () {
    $(".nk-menu-sub .nk-menu-item ").each(function () {
        if ($(this).hasClass("active")) {
            let parentMenu = $(this).closest(".nk-menu-item.has-sub");
            parentMenu.addClass("active current-page");
            parentMenu.find(".nk-menu-sub").show();
        }
    });
    $("#attachmentModal").on("mousedown", function (e) {
        if ($(e.target).hasClass("modal")) {
            closedByBackdropClick = true;
        }
    });

    $("#attachmentModal").on("hide.bs.modal", function (e) {
        if (closedByBackdropClick) {
            $("#doc_awarded").val("false").trigger("change");
        }
        closedByBackdropClick = false;
    });

    $("#cancel-site").click(function () {
        $("#doc_awarded").val("false").trigger("change");
    });

    $("#doc_awarded").select2({
        placeholder: "Select Awarded",
        allowClear: true,
        minimumResultsForSearch: Infinity // This disables the search box
    });

});

$("#doc_awarded").on("change", function () {
    if ($(this).val() === "true") {
        $("#attachmentModal").modal("show");

    }
});

$("#doc_awarded").on("change", function () {
    if (this.value == "false") {
        $("#doc_code").val("");
        $("#doc_work_name").val("");
        $("#doc_code").removeClass("disableInput")

    }
});

$("#doc_selected_site").on("change", function () {
    const selectedOption = $(this).find("option:selected");
    const siteCode = selectedOption.data("site-code");
    const siteName = $(this).val();

    $("#doc_work_name").val(siteName).trigger("change").valid();
    $("#doc_code").val(siteCode).trigger("change").valid();

    $("#doc_code").addClass("disableInput");
    if ($("#attachmentModal").hasClass("show")) {
        $("#attachmentModal").modal("hide");
    }
});


$("#doc_completion_date").on("change", function () {
    const date = $(this).val();
    $("#doc_revised_date").val(date);
    $("#doc_revised_date").datepicker("update", date);

    if (dplEndingMonths > 0) {
        dplEndingOnDate(dplEndingMonths);
    }
});

$("#doc_revised_date").on("change", function () {
    console.log("revised date changed");
    if (dplEndingMonths > 0) {
        dplEndingOnDate(dplEndingMonths);
    }
});

$("#doc_dlp_period").on("input", function () {
    dplEndingMonths = parseInt($(this).val(), 10);
    dplEndingOnDate(parseInt($(this).val(), 10))
});


$("#doc_awarded").on("select2:clear", function (e) {
    $("#doc_code").val("");
    $("#doc_work_name").val("");
    $("#doc_code").removeClass("disableInput")
    $("#doc_selected_site").val(null).trigger("change");

});


function dplEndingOnDate(dplEndingMonths) {
    let completionDateStr = $("#doc_revised_date").val();
    let dlpMonths = dplEndingMonths;

    if (!completionDateStr || isNaN(dlpMonths)) {
        $("#doc_dlp_ending").val("").trigger("change");
        return;
    }

    let parts = completionDateStr.split("/");
    let completionDate = new Date(parts[2], parts[1] - 1, parts[0]);

    completionDate.setMonth(completionDate.getMonth() + dlpMonths);
    let newCompletionDate =
        ("0" + completionDate.getDate()).slice(-2) + "/" +
        ("0" + (completionDate.getMonth() + 1)).slice(-2) + "/" +
        completionDate.getFullYear();

    $("#doc_dlp_ending").val(newCompletionDate).trigger("change");
    $("#doc_dlp_ending").datepicker("update", newCompletionDate);
}