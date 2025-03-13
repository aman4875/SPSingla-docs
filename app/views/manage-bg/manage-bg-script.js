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

