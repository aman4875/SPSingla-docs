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
        // Use your desired icon classes
        fetchProjects(name)
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

$("#table-head .nk-tb-col").click(function () {
    const column = $(this);
    const span = column.find("span"); // Find the span inside
    let dataTable = column.attr("data-table");
    console.log("🚀 Span Element:", span[0]);
    console.log("🚀 data-field Attribute:", span.attr("data-table"));

    return


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
