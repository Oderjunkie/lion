
/*
const format_options = '~([*a%';
const is_format_option = char => format_options.includes(char);

function readable_stringify(data) {
  if (typeof data == '')
}

function format(format_string, ...data) {
  let index_in_str = 0;
  let index_in_data = 0;
  let output = '';
  while (index_in_str < format_string.length) {
    if (format_string[index_in_str] != '~') {
      output += format_string[index_in_str];
      index_in_str++;
      continue;
    }

    const starting_index_in_str = index_in_str + 1;
    
    do
      index_in_str++;
    while (
      !is_format_option(format_string[index_in_str])
      && index_in_str < format_string.length
    );

    if (index_in_str >= format_string.length)
      throw new Error('invalid formatting option');

    const options = format_string.slice(starting_index_in_str, index_in_str);
    
    if (format_string[index_in_str] == '~') {
      output += '~';
      index_in_str++;
      continue;
    }
    
    if (format_string[index_in_str] == '*') {
      if (options[options.length - 1] == ':') {
        index_in_data -= ~~options.slice(0, options.length - 1);
      } else if (options[options.length - 1] == '@') {
        index_in_data = ~~options.slice(0, options.length - 1);
      } else {
        index_in_data += ~~options;
      }
    }

    if (format_string[index_in_str] == 'a') {
      output += readable_stringify(data[index_in_data]);
      index_in_str++;
      continue;
    }
  }
  return output;
}
*/