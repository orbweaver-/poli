#include "link-includes.h"

void diagram_test(int argc, char * argv[]) {
    // SETUP
    verbosity = 0;
    Dictionary    dict;
    Parse_Options opts;
    Sentence      sent;
    Linkage       linkage;
    char *        diagram;
    int           i, num_linkages;
    char *        input_string = (char*) malloc(1024*sizeof(char));
    // input_string = "Grammar is useless because there is nothing to say";

    opts  = parse_options_create();
    dict  = dictionary_create("4.0.dict", "4.0.knowledge", NULL, "4.0.affix");

    // READ INPUT FILE
    FILE *fp;
    char* buff = (char*) malloc(1024*sizeof(char));

    fp = fopen("input.txt", "r");
    fgets(buff, 1024, (FILE*)fp);
    fclose(fp);
    strcpy(input_string, buff);

    // CREATE LINKAGE
    sent = sentence_create(input_string, dict);
    num_linkages = sentence_parse(sent, opts);
    if (num_linkages == 0) {
        sentence_delete(sent);
        dictionary_delete(dict);
        parse_options_delete(opts);
        return;
    }

    linkage = linkage_create(0, sent, opts);
    char links[100000];
    for (int i =0; i < linkage_get_num_links(linkage);i++) {
        int l = linkage_get_link_lword(linkage, i);;
        char* left = i == 0 
            ? LEFT_WALL_DISPLAY
            : i == (linkage_get_num_words(linkage)-1)
                ? RIGHT_WALL_DISPLAY
                : linkage_get_word(linkage, l);

        int r = linkage_get_link_rword(linkage, i);
        char* right = i == 0 
            ? LEFT_WALL_DISPLAY
            : i == (linkage_get_num_words(linkage)-1)
                ? RIGHT_WALL_DISPLAY
                : linkage_get_word(linkage, r);

        char* label = linkage_get_link_label(linkage, i);
        char* llabel = linkage_get_link_llabel(linkage, i);
        char* rlabel = linkage_get_link_rlabel(linkage, i);

        char** dname = linkage_get_link_domain_names(linkage, i);
        char domains[20] = "[";
        for (int j=0; j<linkage_get_link_num_domains(linkage, i); j++) {
            char tmp[7];
            sprintf(tmp, "\"%s\"", dname[j]);
            strcat(domains, tmp);
            if (j < linkage_get_link_num_domains(linkage, i) - 1) {
                strcat(domains, ", ");
            }
        }
        strcat(domains, "]");

        char link[5000];
        sprintf(link, "\
    {\n\
        \"id\": %d,\n\
        \"leftWord\": \"%s\",\n\
        \"rightWord\": \"%s\",\n\
        \"label\": \"%s\",\n\
        \"leftLabel\": \"%s\",\n\
        \"rightLabel\": \"%s\",\n\
        \"domains\": %s\n\
    }", i, left, right, label, llabel, rlabel, domains);
        if (i < linkage_get_num_links(linkage) - 1) {
            strcat(link, ",\n");
        }
        strcat(links, link);
    }
    char json[1000000]; 
    sprintf(json, "\
{\n\
    \"sentence\": \"%s\",\n\
    \"links\": [\n\
%s\
    ]\n\
}", input_string, links);
    printf(json);

    dictionary_delete(dict);
    parse_options_delete(opts);
}