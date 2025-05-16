$(document).on("click", "#deleteDocument", function (event) {
  const modalCloseBtn = document.querySelector("#closeModal");
  event.preventDefault();
  $(`#modalAction`).addClass("disable");
  $.ajax({
    type: "DELETE",
    url: "/fdr/delete-fdr",
    data: {
      docIdToDelete: docIdToDelete,
      bank_id: bankID,
    },
    success: function (response) {
      if (response.status == 1) {
        NioApp.Toast(
          "<h5>Deleted Successfully</h5><p>Document deleted successfully!</p>",
          "success"
        );
        modalCloseBtn.click();
        fetchAllfdrs();
        $(`#modalAction`).removeClass("disable");
      } else {
        NioApp.Toast(
          `<h5>Something Went Wrong</h5>${
            response.msg || `<p>Error while Document deleted</p>`
          }`,
          "error"
        );
        modalCloseBtn.click();
        $(`#modalAction`).removeClass("disable");
      }
    },

    error: function (xhr, status, error) {
      NioApp.Toast(
        `<h5>Something Went Wrong</h5>${
          response.msg || `<p>Error while Document deleted</p>`
        }`,
        "error"
      );
      modalCloseBtn.click();
      $(`#modalAction`).removeClass("disable");
    },
  });
});

$(document).on("click", "#deleteDoc", function (event) {
  event.preventDefault();
  let openModal = document.getElementById("open-modal");

  docIdToDelete = $(this).data("id"); // Using .data() to get 'data-id'
  bankID = $(this).data("bank_id");

  if (docIdToDelete) {
    openModal.click();
  }
});

$(".filter-limit a").click(function (event) {
  event.preventDefault();
  const selectedLimit = $(this).data("limit");
  filters.limit = selectedLimit;
  $(".filter-limit li").removeClass("active");
  $(this).parent().addClass("active");
  fetchAllfdrs();
});

function handlePaginationClick(event) {
  event.preventDefault();
  const $target = $(event.target).closest("li");
  let newPage = filters.page;

  if ($target.hasClass("previous") && filters.page > 1) {
    newPage--;
  } else if ($target.hasClass("next") && filters.page < totalPages) {
    newPage++;
  } else {
    const clickedPage = parseInt($target.find("a").text());
    if (!isNaN(clickedPage)) {
      newPage = clickedPage;
    }
  }

  if (newPage !== filters.page) {
    filters.page = newPage;
    fetchAllfdrs();
  }
}

$("#table-pagination").on("click", "a", handlePaginationClick);
