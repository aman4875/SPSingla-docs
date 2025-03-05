function resetSortFilter() {
    $("#table-head .nk-tb-col").removeClass("sort-asc sort-dsc active");
}

$('#resetFilters').on('click', function () {
    if (Object.keys(filters.activeFilter).length) {
        filters = {
            limit: 10,
            page: 1,
            sort: {},
            activeFilter: {},
        };
        resetSortFilter()
        const resetFields = [
            '#doc_awarded',
        ];
        resetFields.forEach((selector) => {
            const $field = $(selector);
            if ($field.val() !== "empty") {
                $field.val("empty").trigger('change');
            }
        });

        // all filters with input reset val ""
        const resetFieldsEmpty = [
            '#doc_code',
            '#doc_work_name',
            '#doc_financial_date',
            '#doc_agreement_no',
            '#doc_agreement_date',
            '#doc_completion_date',
            '#doc_total_mobilisation_amount',
            '#doc_bal_mobilisation_amount',
            '#doc_retention_amount',
            '#doc_dlp_period',
            '#doc_revised_date',
            '#doc_dlp_ending',
            '#doc_department',
        ];

        resetFieldsEmpty.forEach((selector) => {
            const $field = $(selector);
            if ($field.val() !== "") {
                $field.val("").trigger('change');
            }
        });

        return
    }

    if (Object.keys(filters.sort).length) {
        resetSortFilter()
        filters = {
            limit: 10,
            page: 1,
            sort: {},
            activeFilter: {},
        };
        fetchDocuments()
    }
});

$('.js-select2').select2({
    placeholder: 'Select an option',
    width: 'resolve'
});

$("#table-head .nk-tb-col").click(function () {
    const column = $(this);

    if (column.hasClass("date")) {
        filters.isDate = true;
    } else {
        filters.isDate = false;
    }

    const columnName = column.find("span").data("field")
    let newSortClass = "";

    if (column.hasClass("sort-asc")) {
        newSortClass = "sort-dsc";
    } else if (column.hasClass("sort-dsc")) {
        newSortClass = "";
    } else {
        newSortClass = "sort-asc";
    }
    filters.sort = {};

    // If there's a new sorting order, update the filter and apply class
    if (newSortClass) {
        filters.sort[columnName] = newSortClass === "sort-dsc" ? "DSC" : "ASC";
        column.addClass(newSortClass).addClass("active");
    }

    // Update sorting styles for all columns based on filters.sort
    $("#table-head .nk-tb-col").removeClass("sort-dsc sort-asc active");
    $("#table-head .nk-tb-col").each(function () {
        const field = $(this).find("span").data("field");
        if (filters.sort[field]) {
            $(this).addClass(filters.sort[field] === "DSC" ? "sort-dsc" : "sort-asc").addClass("active");
        }
    });

    fetchProjects();
});


$('#scroll-left').on('click', function () {
    $('.scrollable-datatable').animate({ scrollLeft: '-=300' }, 200);
});

$('#scroll-right').on('click', function () {
    $('.scrollable-datatable').animate({ scrollLeft: '+=300' }, 200);
});