# 1. Manage dependencies

## List of required dependencies
required.packages = c(
  # Used for data manipulation
  'magrittr',
  'dplyr',
  # Used to write output targets
  'jsonify',
  # Used to prompt client for archive password
  'rstudioapi'
)

## Install any missing dependencies
missing.packages = base::setdiff(required.packages, base::rownames(utils::installed.packages()))
if (base::length(missing.packages) > 0) {
  base::invisible(utils::install.packages(missing.packages))
}

## Load dependencies into current namespace if missing
attached.packages = base::loadedNamespaces()
unloaded.packages = base::setdiff(required.packages, attached.packages)
if (base::length(unloaded.packages) > 0) {
  base::invisible(base::lapply(unloaded.packages, base::require, character.only=TRUE))
}


# 2. Processing Atlas Datasets to create output(s)

## Load data from Spiros' Atlas files
files = base::list.files('./data/', pattern='\\.csv$', full.names=TRUE)

datasets = list()
for (file in files) {
  filename = base::sub('\\.csv$', '', base::basename(file))
  datasets[[filename]] = utils::read.csv(file)
}

## Prepare files
base::names(datasets$smr) = c('phecode', 'smr', 'ci_l', 'ci_r')

## Build & merge data with fields of interest across datasets
data = datasets$median_age_pop_stand
base::names(data) = c('phecode', 'Age', 'Frequency')

data = base::merge(
  x     = data,
  y     = datasets$phe_dictionary[, c('phecode', 'nicename')],
  by    = 'phecode',
  all.x = TRUE
)

data = base::merge(
  x     = data,
  y     = datasets$phe_organ_speciality[, c('phecode', 'organ_system_specialty')],
  by    = 'phecode',
  all.x = FALSE
)

data = base::merge(
  x     = data,
  y     = datasets$phe_organ_speciality[, c('phecode', 'organ_nicename')],
  by    = 'phecode',
  all.x = FALSE
)

data = base::merge(
  x     = data,
  y     = datasets$phe_organ_speciality[, c('phecode', 'organ')],
  by    = 'phecode',
  all.x = FALSE
)

data = base::merge(
  x     = data,
  y     = datasets$phe_dictionary[, c('phecode', 'sex')],
  by    = 'phecode',
  all.x = FALSE
)

data = base::merge(
  x     = data,
  y     = datasets$phe_dictionary[, c('phecode', 'type')],
  by    = 'phecode',
  all.x = FALSE
)

data = base::merge(
  x     = data,
  y     = datasets$phe_dictionary[, c('phecode', 'url')],
  by    = 'phecode',
  all.x = FALSE
)

data = base::merge(
  x     = data,
  y     = datasets$phe_dictionary[, c('phecode', 'category')],
  by    = 'phecode',
  all.x = FALSE
)

data = base::merge(
  x     = data,
  y     = datasets$smr[, c('phecode', 'smr')],
  by    = 'phecode',
  all.x = FALSE
)

## Filter rows with unknown specialities
##
##   Note: we're only doing this to ensure we have visually appealing
##         clusters when viewed from the explorer - this probably shouldn't
##         and/or wouldn't happen in a production environment once the data
##         has been finalised by Spiros et al
##
data = dplyr::filter(data, organ_system_specialty != 'Unknown')

## Rename columns
base::names(data) = c(
   'Phecode',       'Age', 'Frequency',    'Name', 'SystemSpeciality', 'OrganTarget',
  'OrganRef',       'Sex',      'Type', 'SlugRef',         'Category', 'Mortality'
)

## Reorder columns
data = dplyr::select(
  .data = data,
  # Col Order
  Phecode, Name,              Age,   Frequency,       Sex,  Mortality,
  Category, Type, SystemSpeciality, OrganTarget,  OrganRef,   SlugRef
)

## Save target as csv for future use if required
utils::write.csv(data, './data/explorer-data.csv')

## Save target as json for use within the `atlas-explorer` package
jdata = jsonify::to_json(data)
ftarget = base::file('./data/explorer-data.json', open='wt')

base::writeLines(jdata, con=ftarget)
base::close(ftarget)


# 3. Zip output with encryption

## Ask user for password
##
##   Note: this var is hidden from R.env because it's prepended with a `.`
##
.archive.password = rstudioapi::askForPassword(prompt = 'Please enter archive password...')

## Collect file targets
file.targets = base::list.files(
  path         = '.',
  pattern      = '\\.csv$|\\.json$',
  all.files    = FALSE,
  full.names   = FALSE,
  recursive    = TRUE,
  ignore.case  = FALSE,
  include.dirs = FALSE
)

## Compress into encrypted archive
utils::zip(
  zipfile = base::file.path(getwd(), 'encrypted.data.zip'),
  files   = file.targets,
  flags   = base::paste('--password', .archive.password, sep=' ')
)

## Remove pwd from R.env to stop the client from saving it
base::remove('.archive.password')
