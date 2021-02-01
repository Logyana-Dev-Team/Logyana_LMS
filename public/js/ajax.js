const { data } = require("jquery");

function removeAssociate(userId, associateName) {
  $.ajax({
    url: "/removeAssociate",
    method: "post",
    dataType: "json",
    data: {
      userId: userId,
      associateName: associateName,
    },
    beforeSend: function () {
      // Show image container
      $("#loader").show();
    },
    success: function (response) {
      $("#loader").hide();
      location.reload();
    },
    error: function (response) {
      alert("server error occured");
    },
  });
}

function assignAssociate(associateId, userId) {
  $.ajax({
    url: "/assignAssociate",
    method: "post",
    dataType: "json",
    data: {
      userId: userId,
      associateId: associateId,
    },
    beforeSend: function () {
      // Show image container
      $("#loader").show();
    },
    success: function (response) {
      location.reload();
      $("#loader").hide();
    },
    error: function (response) {
      alert("server error occured");
    },
  });
}

function removeSalesPerson(userId, salesPersonName) {
  $.ajax({
    url: "/removeSalesPerson",
    method: "post",
    dataType: "json",
    data: {
      userId: userId,
      salesPersonName: salesPersonName,
    },
    beforeSend: function () {
      // Show image container
      $("#loader").show();
    },
    success: function (response) {
      $("#loader").hide();
      location.reload();
    },
    error: function (response) {
      alert("server error occured");
    },
  });
}

function assignSalesPerson(salesPersonId, userId) {
  $.ajax({
    url: "/assignSalesPerson",
    method: "post",
    dataType: "json",
    data: {
      userId: userId,
      salesPersonId: salesPersonId,
    },
    beforeSend: function () {
      // Show image container
      $("#loader").show();
    },
    success: function (response) {
      location.reload();
      $("#loader").hide();
    },
    error: function (response) {
      alert("server error occured");
    },
  });
}
