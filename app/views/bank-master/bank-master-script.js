function renderBankList(list) {
  let bankList = $("#bankListContainer");
  bankList.empty();
  let rows = "";
  list.forEach((item, index) => {
    let html = `
        <div class="nk-tb-item table-content">
            <div class="nk-tb-col tb-col-sm">
                <span>${index + 1}</span>
            </div>
            <div class="nk-tb-col tb-col-md">
                <span>${item.bank_code}</span>
            </div>
            <div class="nk-tb-col tb-col-md">
                <span>${item.bank_name}</span>
            </div>
            <div class="nk-tb-col tb-col-md">
                <span>${item.bank_branch}</span>
            </div>
            <div class="nk-tb-col nk-tb-col-tools text-end">
                <ul class="nk-tb-actions gx-1 my-n1">
                    <li class="nk-tb">
                        <span 
                          class="btn btn-trigger btn-icon editBtn"
                          data-id="${item.doc_id}"
                          data-code="${item.bank_code}"
                          data-name="${item.bank_name}"
                          data-branch="${item.bank_branch}">
                            <em class="icon ni ni-edit"></em>
                        </span>
                        <span data-id="${item.doc_id}" class="${  item.bank_code_status ?'disable btn btn-trigger btn-icon' :'btn btn-trigger btn-icon'}" id="deleteBank">
                            <em style="color: #d84040;" class="icon ni ni-trash-fill"></em>
                        </span>
                    </li>
                </ul>
            </div>
        </div>
        `;
    rows += html;
  });

  bankList.after(rows); // This will replace old list
}

$(document).on("click", "#deleteBank", function (event) {
  event.preventDefault();
  let openModal = document.getElementById("open-modal");
  docIdToDelete = $(this).data("id");
  if (docIdToDelete) {
    openModal.click();
  }
});

$("#cancleSavebank").on("click", function () {
  $("#bank_code").val("").trigger("change");
  $("#bank_name").val("").trigger("change");
  $("#bank_branch").val("").trigger("change");
});

$("#confirmDelete").on("click", function () {
  const modalCloseBtn = document.querySelector("#closeModal");
  fetch("/bank-master/delete-bank", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bank_id: docIdToDelete }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.status === 200) {
        modalCloseBtn.click();
        $(`#modalAction`).removeClass("disable");
        NioApp.Toast(
          "<h5>Deleted Successfully</h5><p>Document deleted successfully!</p>",
          "success"
        );
        getAllBanks();
      } else {
        modalCloseBtn.click();
        $(`#modalAction`).removeClass("disable");
        NioApp.Toast(
          "<h5>Error</h5><p>Failed to delete the bank!</p>",
          "error"
        );
      }
    })
    .catch((error) => console.error("Error:", error));
});

