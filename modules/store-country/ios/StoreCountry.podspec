Pod::Spec.new do |s|
  s.name           = 'StoreCountry'
  s.version        = '1.0.0'
  s.summary        = 'Reads the country of the customer\'s App Store'
  s.description    = 'Returns the App Store storefront country (a 3-letter code such as USA or IND).'
  s.author         = 'NikFoods'
  s.homepage       = 'https://www.nikfoods.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.{h,m,swift}'
  s.swift_version  = '5.4'
end
