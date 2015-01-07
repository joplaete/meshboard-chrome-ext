// gets injected programatically
var data = {};
var meta_tags = $("meta");
for (var i = meta_tags.length - 1; i >= 0; i--) {
	var tag = meta_tags[i];
	var tag_name = undefined;
	var tag_content = undefined;
	for (var j = tag.attributes.length - 1; j >= 0; j--) {
		var t = tag.attributes[j];
		// console.log(t.nodeName + ' > ' + t.value);
		if(t.nodeName=="name"){
			tag_name = t.value;
		}else if(t.nodeName=="property"){
			tag_name = t.value;
		}else if(t.nodeName=="content"){
			tag_content = t.value;
		}
	}
	if(tag_name && tag_content){
		data[tag_name] = tag_content;
	}
};
data.action = "get_meta";
chrome.extension.sendMessage(data);