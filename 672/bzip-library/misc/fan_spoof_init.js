for (var i = 1; i <= 99; i++) {
  var select1 = document.getElementById("fws1");
  var option1 = document.createElement("OPTION");
  select1.options.add(option1);
  option1.text = i;
  option1.value = i;
}
fws1.value = 9;
for (var i = 0; i <= 99; i++) {
  var select2 = document.getElementById("fws2");
  var option2 = document.createElement("OPTION");
  select2.options.add(option2);
  option2.text = ("0" + i).slice(-2);
  option2.value = i;
}
fws2.value = 0;
for (var i = 40; i <= 79; i++) {
  var select = document.getElementById("tempC");
  var option = document.createElement("OPTION");
  select.options.add(option);
  option.text = i;
  option.value = i;
}
tempC.value = 79;
