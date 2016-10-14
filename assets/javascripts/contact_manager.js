var contacts;

(function () {
  contacts = {
    collection: [],
    bindEvents: function () {
      $('#contacts').on('click', '#edit', this.updateContact.bind(this));
      $('#contacts').on('click', '#delete', this.destroyContact.bind(this));
      $('#contacts').on('click', '.tag', this.deleteTag.bind(this));
      $('#search').on('keyup', this.search.bind(this));
      $('button.add').on('click', this.showForm.bind(this));
      $('form').on('click', 'button', this.hideForm.bind(this));
      $('form').on('submit', this.createContact.bind(this));
      $('form').on('keypress', '#tags', this.createTag.bind(this));
      $('form').on('click', '.tag', this.deleteTag.bind(this));
      $('form').on('keypress', this.preventReturn.bind(this));
      $(window).on('unload', this.storeCollection.bind(this));
    },

    cacheTemplates: function () {
      var $contact  = $('#contact_template').remove();
      var $allContacts = $('#all_contacts_template').remove();
      var $tag = $('#tag_template').remove();
      var $allTags = $('#all_tags_template').remove();

      this.contactTemplate = Handlebars.compile($contact.html());
      this.allContactsTemplate = Handlebars.compile($allContacts.html());
      this.tagTemplate = Handlebars.compile($tag.html());
      this.allTagsTemplate = Handlebars.compile($allTags.html());

      Handlebars.registerPartial('all_tags_template', $allTags.html());
      Handlebars.registerPartial('contact_template', $contact.html());
      Handlebars.registerPartial('tag_template', $tag.html());
    },

    showForm: function () {
      $('main').hide();
      $('#form').slideUp().fadeIn();
    },

    hideForm: function (e) {
      if (e) e.preventDefault();
      this.resetForm();
      $('#form').slideDown().fadeOut();
      $('main').show();
      this.renderAllContacts();
    },

    resetForm: function () {
      $('#form form').get(0).reset();
      $('#form').attr('data-editing', '');
      $('#form div').removeClass('error');
      $('#tagslist').find('span').remove();
      $('#tagslist p').show();
    },

    createContact: function (e) {
      var data = $(e.currentTarget).serializeArray();
      var idx = $('#form').attr('data-editing');
      var contact = this.getContactById(idx);
      var tags = [];

      e.preventDefault();
      if (this.invalidInput('name', 'email', 'telephone')) return;

      $('#tagslist span').each(function () {
        tags.push(this.innerHTML);
      });

      if (contact) {
        this.extend(contact, data);
        contact.tags = tags;
      } else {
        contact = this.extend({}, data);
        contact.tags = tags;
        this.collection.push(contact);
      }

      this.hideForm();
    },

    invalidInput: function () {
      var fields = [].slice.call(arguments);
      var error = false;

      fields.forEach(function (field) {
        var $field = $('#form').find('input[name="' + field + '"]');
        if ($field.val() === '') {
          $field.closest('div').addClass('error');
          error = true;
          return;
        }
      });

      return error;
    },

    extend: function (object, data) {
      data.forEach(function (source) {
        object[source.name] = source.value;
      });

      if (!object.id) object.id = this.getLastId() + 1;
      return object;
    },

    updateContact: function (e) {
      var idx = $(e.target).closest('div').attr('data-id');
      var contact = this.getContactById(idx);

      this.fillForm(contact);
      this.showForm();
    },

    fillForm: function (contact) {
      $('#form').attr('data-editing', contact.id);
      $('#form').find('input[name="name"]').val(contact.name);
      $('#form').find('input[name="email"]').val(contact.email);
      $('#form').find('input[name="telephone"]').val(contact.telephone);
      $('#tagslist').append(this.allTagsTemplate({ tags: contact.tags }));
      if ($('#tagslist span').length > 0) $('#tagslist p').hide();
    },

    destroyContact: function (e) {
      var result = confirm('Are you sure you want to remove this contact?');
      var $contact = $(e.target).closest('div');
      var idx = $contact.attr('data-id');

      if (!result) return;
      $contact.remove();
      this.removeFromCollection(idx);
      localStorage.removeItem(idx);
      this.renderAllContacts();
    },

    createTag: function (e) {
      var input = $(e.currentTarget).val();
      if (e.which === 13 && input) {
        $('#tagslist p').hide();
        $('#tagslist').append(this.tagTemplate(input));
        $(e.currentTarget).val('');
      }
    },

    deleteTag: function (e) {
      var onMainPage = $(e.target).closest('div').attr('id') === undefined;
      var $contact =   onMainPage ? $(e.target).closest('div') : undefined;
      var idx =        onMainPage ? $contact.attr('data-id')   : $('#form').attr('data-editing');
      var contact =    this.getContactById(idx);
      var clickedTag = $(e.target).remove().text();

      contact.tags = contact.tags.filter(function (tag) {
        return tag !== clickedTag;
      });

      if (!onMainPage && $('#tagslist span').length === 0) $('#tagslist p').show();
      if (onMainPage && contact.tags.length === 0) this.renderAllContacts();
    },

    search: function (e) {
      var searchString = $(e.currentTarget).val().toLowerCase().trimLeft();
      var searchBy = $('select').val();

      if (searchString === '') {
        this.renderAllContacts();
        $('#no_results').hide();
        return;
      }

      this.collection.forEach(function (contact) {
        var propValue = contact[searchBy];
        var $contact = $('#contacts').find('div[data-id="' + contact.id + '"]');
        var regEx = new RegExp(searchString, 'i');

        if (searchBy === 'name') {
          propValue.match(regEx) ? $contact.show() : $contact.hide();
        } else if (searchBy === 'tags') {
          var foundMatch = propValue.some(function (tag) { return tag.match(regEx); });

          foundMatch ? $contact.show() : $contact.hide();
        }
      });

      if (this.visibleContactCount() === 0) {
        $('#no_results').find('strong').text(searchString);
        $('#no_results').show();
      }
    },

    visibleContactCount: function () {
      return $('#contacts').find('div[data-id]:visible').length;
    },

    renderAllContacts: function () {
      if (this.collection.length === 0) {
        $('#no_contacts').show();
      } else {
        $('#no_contacts').hide();
        $('#contacts').html(this.allContactsTemplate({ contacts: this.collection }));
      }
    },

    preventReturn: function (e) {
      if (e.which === 13) return false;
    },

    getContactById: function (id) {
      var foundContact;
      this.collection.forEach(function (contact) {
        if (contact.id === +id) {
          foundContact = contact;
          return;
        }
      });

      return foundContact;
    },

    removeFromCollection: function (id) {
      this.collection = this.collection.filter(function (item) {
        return item.id !== +id;
      });
    },

    getLastId: function () {
      var lastId = 0;
      this.collection.forEach(function (contact) {
        if (contact.id > lastId) lastId = contact.id;
      });

      return lastId;
    },

    storeCollection: function () {
      this.collection.forEach(function (contact) {
        localStorage.setItem(contact.id, JSON.stringify(contact));
      });
    },

    loadCollection: function () {
      for (var key in localStorage) {
        var contact = JSON.parse(localStorage.getItem(key));
        this.collection.push(contact);
      }
    },

    init: function () {
      this.bindEvents();
      this.cacheTemplates();
      this.loadCollection();
      this.renderAllContacts();
    },
  };
})();

$(contacts.init.bind(contacts));
