// jsdom deliberately leaves layout APIs unimplemented. The design-system
// select scrolls its active option into view, so provide the browser no-op the
// component expects instead of letting every successful test print an error.
Element.prototype.scrollIntoView = () => undefined;
