#include "link-includes.h"

void diagram_test() {
    Dictionary    dict;
    Parse_Options opts;
    Sentence      sent;
    Linkage       linkage;
    char *        diagram;
    int           i, num_linkages;
    char *        input_string[] = {
       "Grammar is useless because there is nothing to say",
       "Computers are useless; they can only give you answers"};

    opts  = parse_options_create();
    dict  = dictionary_create("4.0.dict", "4.0.knowledge", NULL, "4.0.affix");

    char * s = input_string[0];
    sent = sentence_create(s, dict);
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
            sprintf(tmp, "\"%s\", ", dname[j]);
            strcat(domains, tmp);
        }
        strcat(domains, "]");

        char link[5000];
        sprintf(link, "\
    {\n\
        id: %d,\n\
        leftWord: \"%s\",\n\
        rightWord: \"%s\",\n\
        label: \"%s\",\n\
        leftLabel: \"%s\",\n\
        rightLabel: \"%s\",\n\
        domains: %s\n\
    },\n", i, left, right, label, llabel, rlabel, domains);
        strcat(links, link);
    }
    char json[1000000]; 
    sprintf(json, "\
{\n\
    sentence: \"%s\",\n\
    links: [\n\
%s\n\
    ]\n\
}", s, links);
    printf(json);

    dictionary_delete(dict);
    parse_options_delete(opts);
}