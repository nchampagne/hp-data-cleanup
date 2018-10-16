#!/usr/bin/env bash

###############################################################################
# Example: ./execute.sh -m localhost:27017 -c mongo-cleanup
###############################################################################

# Removing previous logs
rm logs/*.log

# Execute
node bin/index.js $@
