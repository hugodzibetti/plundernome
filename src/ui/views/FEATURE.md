# Feature: UI Views

## Owned files: src/ui/views/*
## Depends on: src/ui/widgets/, controller layer
## Dependents: src/ui/window.ts (swaps views in Gtk.Stack)
## Agent notes: Each view = Adw.Bin subclass. Four views: catalog, downloads, library, settings. Views receive data via setters, emit signals via callbacks. No direct service calls.
