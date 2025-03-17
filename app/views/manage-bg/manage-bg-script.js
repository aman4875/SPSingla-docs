$('#scroll-left').on('click', function () {
    $('.scrollable-datatable').animate({ scrollLeft: '-=300' }, 200);
});

$('#scroll-right').on('click', function () {
    $('.scrollable-datatable').animate({ scrollLeft: '+=300' }, 200);
});

$(document).ready(function () {
    $('#manage-project').select2({
        templateResult: formatProject,
        templateSelection: formatSelection,
        width: '100%'
    });
    $('#manage-project').select2({
        templateResult: formatProject,
        templateSelection: formatSelection,
        width: '100%',
        escapeMarkup: function (markup) {
            return markup;
        }
    });


    function formatProject(state) {
        if (!state.id) return state.text; // For placeholder option
        var $state = $(state.element);
        var code = $state.data('code');
        var name = $state.data('name');

        // Build custom HTML markup for each option
        var $container = $(
            '<div class="select2-result-project custom-project">' +
            '<div class="select2-result-project__icon"><em class="icon ni ni-folder"></em></div>' +
            '<div class="select2-result-project__meta">' +
            '<div class="select2-result-project__code"></div>' +
            '<div class="select2-result-project__name"></div>' +
            '</div>' +
            '</div>'
        );
        $container.find('.select2-result-project__code').text(code);
        $container.find('.select2-result-project__name').text(name);
        return $container;
    }


    function formatSelection(state) {
        if (!state.id) return state.text; // placeholder
        const $state = $(state.element);
        const name = $state.data('name');
        const code = $state.data('code');
        projectCode = code
        // Use your desired icon classes
        fetchProjects()
        return `<span><em class="icon ni ni-folder" style="margin-right:5px;"></em>${name}</span>`;
    }


});

function updatePagination(totalPages, currentPage) {
    const $pagination = $('#table-pagination .pagination');
    $pagination.empty();

    // Previous button
    $pagination.append(`<li class="paginate_button page-item ${currentPage === 1 ? 'disabled' : 'previous'}" id="DataTables_Table_2_previous"><a aria-controls="DataTables_Table_2" role="link" data-dt-idx="previous" tabindex="0" class="page-link">Prev</a></li>`);

    // Helper function to create a page item
    const createPageItem = (page, active = false) => {
        return `<li class="paginate_button page-item ${active ? 'active' : ''}"><a href="#" aria-controls="DataTables_Table_2" role="link" data-dt-idx="${page}" tabindex="0" class="page-link">${page}</a></li>`;
    };

    // Render first 3 pages
    for (let i = 1; i <= 3; i++) {
        if (i <= totalPages) {
            $pagination.append(createPageItem(i, i === currentPage));
        }
    }

    // Render middle dots if necessary
    if (currentPage > 4 && totalPages > 6) {
        $pagination.append('<li class="paginate_button page-item disabled"><a href="#" class="page-link">...</a></li>');
    }

    // Render current page in middle if it's not in the first or last 3 pages
    if (currentPage > 3 && currentPage < totalPages - 2) {
        $pagination.append(createPageItem(currentPage, true));
    }

    // Render middle dots if necessary
    if (currentPage < totalPages - 3 && totalPages > 6) {
        $pagination.append('<li class="paginate_button page-item disabled"><a href="#" class="page-link">...</a></li>');
    }

    // Render last 3 pages
    for (let i = totalPages - 2; i <= totalPages; i++) {
        if (i > 3) {
            $pagination.append(createPageItem(i, i === currentPage));
        }
    }

    // Next button
    $pagination.append(`<li class="paginate_button page-item ${currentPage === totalPages ? 'disabled' : 'next'}" id="DataTables_Table_2_next"><a aria-controls="DataTables_Table_2" role="link" data-dt-idx="next" tabindex="0" class="page-link">Next</a></li>`);
}
function resetSortFilter() {
    $("#table-head .nk-tb-col").removeClass("sort-asc sort-dsc active");
}

// $("#table-head .nk-tb-col").click(function () {
//     const column = $(this);
//     const span = column.find("span");
//     let dataTable = span.attr("data-table") || 'manageBg';


//     if (column.hasClass("date")) {
//         filters.isDate = true;
//     } else {
//         filters.isDate = false;
//     }

//     const columnName = column.find("span").data("field")
//     let newSortClass = "";

//     if (column.hasClass("sort-asc")) {
//         newSortClass = "sort-dsc";
//     } else if (column.hasClass("sort-dsc")) {
//         newSortClass = "";
//     } else {
//         newSortClass = "sort-asc";
//     }
//     filters.sort = {};

//     // If there's a new sorting order, update the filter and apply class
//     if (newSortClass) {
//         filters.sort[columnName] = newSortClass === "sort-dsc" ? "DSC" : "ASC";
//         column.addClass(newSortClass).addClass("active");
//     }
//     filters.sort.dataTable = dataTable

//     // Update sorting styles for all columns based on filters.sort
//     $("#table-head .nk-tb-col").removeClass("sort-dsc sort-asc active");
//     $("#table-head .nk-tb-col").each(function () {
//         const field = $(this).find("span").data("field");
//         if (filters.sort[field]) {
//             $(this).addClass(filters.sort[field] === "DSC" ? "sort-dsc" : "sort-asc").addClass("active");
//         }
//     });

//     fetchProjects();
// });


$('#resetFilters').on('click', function () {
    if (Object.keys(filters.activeFilter).length || projectCode !== null) {
        filters = {
            limit: 10,
            page: 1,
            sort: {},
            activeFilter: {},
        };
        resetSortFilter()
        projectCode = null
        // reset dropdowns 
        const resetFields = [
            '#doc_awarded',
            '#doc_applicant_name',
            '#doc_beneficiary_name',
            '#manage-project'
        ];

        resetFields.forEach((selector) => {
            const $field = $(selector);

            if ($field.length) {
                if ($field.hasClass('select2-hidden-accessible')) {
                    $field.val(null).trigger('change');
                } else {
                    $field.val('');
                }
            }
        });


        // all filters with input reset val ""
        const resetFieldsEmpty = [
            '#project_code',
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
            '#doc_type',
            'doc_bank_name',
            'doc_issuing_branch',
            'doc_bg_number',
            'doc_bg_amendment_number',
            'doc_claim_date',
            'doc_bg_amount',
            'doc_expiry_date',
            'doc_bg_cancelled_date',
            'doc_issue_date',
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