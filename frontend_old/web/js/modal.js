$(function(){
      $(document).on('click', '.showModalButton', function(){
        if ($('#modal').data('bs.modal').isShown) {
            $('#modal').find('#modalContent')
                    .load($(this).attr('value'));
            document.getElementById('modalHeaderTitle').innerHTML = '<h4>' + $(this).attr('title') + '</h4>';
        } else {

            $('#modal').modal('show')
                    .find('#modalContent')
                    .load($(this).attr('value'));

            document.getElementById('modalHeaderTitle').innerHTML = '<h4>' + $(this).attr('title') + '</h4>';
        }
    });
});

